import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, mean_squared_error, r2_score
import joblib
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Nexus ML Service",
    description="Machine Learning service for creative performance prediction",
    version="1.0.0"
)

# Global variables for models and encoders
models = {}
encoders = {}
scalers = {}

class PredictionRequest(BaseModel):
    features: Dict[str, Any]
    model_name: str = "creative-performance-predictor"

class TrainingRequest(BaseModel):
    model_name: str
    training_data: List[Dict[str, Any]]
    target_column: str = "high_performance"
    model_type: str = "classification"  # or "regression"

class PredictionResponse(BaseModel):
    prediction: Any
    confidence: Optional[float] = None
    model_version: str
    features_used: List[str]

class TrainingResponse(BaseModel):
    model_name: str
    accuracy: Optional[float] = None
    mse: Optional[float] = None
    r2: Optional[float] = None
    features: List[str]
    training_samples: int

def prepare_features(data: List[Dict[str, Any]]) -> pd.DataFrame:
    """Prepare and engineer features from raw data"""
    df = pd.DataFrame(data)
    
    # Feature engineering for creative performance
    if 'headline' in df.columns:
        df['headline_length'] = df['headline'].fillna('').astype(str).str.len()
        df['headline_word_count'] = df['headline'].fillna('').astype(str).str.split().str.len()
    
    if 'description' in df.columns:
        df['description_length'] = df['description'].fillna('').astype(str).str.len()
        df['description_word_count'] = df['description'].fillna('').astype(str).str.split().str.len()
    
    if 'ad_text' in df.columns:
        df['ad_text_length'] = df['ad_text'].fillna('').astype(str).str.len()
        df['ad_text_word_count'] = df['ad_text'].fillna('').astype(str).str.split().str.len()
    
    # Numeric features
    numeric_features = ['impressions', 'clicks', 'spend', 'conversions', 'ctr', 'cpc', 'cpm', 'roas']
    for feature in numeric_features:
        if feature in df.columns:
            df[feature] = pd.to_numeric(df[feature], errors='coerce').fillna(0)
    
    # Categorical features
    categorical_features = ['ad_type', 'status', 'call_to_action', 'niche', 'objective']
    for feature in categorical_features:
        if feature in df.columns:
            df[feature] = df[feature].fillna('unknown').astype(str)
    
    # Create performance metrics
    if 'clicks' in df.columns and 'impressions' in df.columns:
        df['calculated_ctr'] = np.where(df['impressions'] > 0, df['clicks'] / df['impressions'] * 100, 0)
    
    if 'spend' in df.columns and 'clicks' in df.columns:
        df['calculated_cpc'] = np.where(df['clicks'] > 0, df['spend'] / df['clicks'], 0)
    
    if 'conversions' in df.columns and 'spend' in df.columns:
        df['conversion_rate'] = np.where(df['clicks'] > 0, df['conversions'] / df['clicks'] * 100, 0)
        df['cost_per_conversion'] = np.where(df['conversions'] > 0, df['spend'] / df['conversions'], 0)
    
    return df

def create_target_variable(df: pd.DataFrame) -> pd.Series:
    """Create target variable for performance prediction"""
    # Define high performance based on multiple metrics
    conditions = []
    
    if 'roas' in df.columns:
        conditions.append(df['roas'] > df['roas'].quantile(0.7))
    
    if 'ctr' in df.columns:
        conditions.append(df['ctr'] > df['ctr'].quantile(0.7))
    
    if 'conversion_rate' in df.columns:
        conditions.append(df['conversion_rate'] > df['conversion_rate'].quantile(0.7))
    
    if conditions:
        # High performance if at least 2 out of 3 conditions are met
        high_performance = sum(conditions) >= 2
        return high_performance.astype(int)
    else:
        # Fallback: random performance for demo
        logger.warning("No performance metrics found, creating random target")
        return pd.Series(np.random.randint(0, 2, len(df)))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ml-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": list(models.keys())
    }

@app.post("/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Train a new ML model"""
    try:
        logger.info(f"Starting training for model: {request.model_name}")
        
        if len(request.training_data) < 10:
            raise HTTPException(status_code=400, detail="Insufficient training data. Need at least 10 samples.")
        
        # Prepare data
        df = prepare_features(request.training_data)
        
        # Create or use provided target variable
        if request.target_column in df.columns:
            y = df[request.target_column]
        else:
            y = create_target_variable(df)
            df[request.target_column] = y
        
        # Select features for training
        feature_columns = []
        
        # Numeric features
        numeric_cols = ['headline_length', 'headline_word_count', 'description_length', 
                       'description_word_count', 'ad_text_length', 'ad_text_word_count',
                       'impressions', 'clicks', 'spend', 'conversions', 'ctr', 'cpc', 'cpm', 'roas',
                       'calculated_ctr', 'calculated_cpc', 'conversion_rate', 'cost_per_conversion']
        
        for col in numeric_cols:
            if col in df.columns:
                feature_columns.append(col)
        
        # Categorical features (encode them)
        categorical_cols = ['ad_type', 'status', 'call_to_action', 'niche', 'objective']
        for col in categorical_cols:
            if col in df.columns:
                if f"{request.model_name}_{col}" not in encoders:
                    encoders[f"{request.model_name}_{col}"] = LabelEncoder()
                
                df[f"{col}_encoded"] = encoders[f"{request.model_name}_{col}"].fit_transform(df[col])
                feature_columns.append(f"{col}_encoded")
        
        if not feature_columns:
            raise HTTPException(status_code=400, detail="No suitable features found for training")
        
        X = df[feature_columns].fillna(0)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        if request.model_type == "classification":
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            
            response_data = {
                "model_name": request.model_name,
                "accuracy": float(accuracy),
                "features": feature_columns,
                "training_samples": len(X_train)
            }
            
        else:  # regression
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test_scaled)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            response_data = {
                "model_name": request.model_name,
                "mse": float(mse),
                "r2": float(r2),
                "features": feature_columns,
                "training_samples": len(X_train)
            }
        
        # Store model and scaler
        models[request.model_name] = model
        scalers[request.model_name] = scaler
        
        # Save model to disk
        model_path = f"models/{request.model_name}.joblib"
        scaler_path = f"models/{request.model_name}_scaler.joblib"
        encoder_path = f"models/{request.model_name}_encoders.joblib"
        
        os.makedirs("models", exist_ok=True)
        
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump({k: v for k, v in encoders.items() if request.model_name in k}, encoder_path)
        
        logger.info(f"Model {request.model_name} trained successfully")
        
        return TrainingResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make prediction using trained model"""
    try:
        model_name = request.model_name
        
        # Load model if not in memory
        if model_name not in models:
            model_path = f"models/{model_name}.joblib"
            scaler_path = f"models/{model_name}_scaler.joblib"
            encoder_path = f"models/{model_name}_encoders.joblib"
            
            if not os.path.exists(model_path):
                raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
            
            models[model_name] = joblib.load(model_path)
            scalers[model_name] = joblib.load(scaler_path)
            
            if os.path.exists(encoder_path):
                model_encoders = joblib.load(encoder_path)
                encoders.update(model_encoders)
        
        # Prepare features
        df = prepare_features([request.features])
        
        # Select and encode features (same as training)
        feature_columns = []
        
        # Numeric features
        numeric_cols = ['headline_length', 'headline_word_count', 'description_length', 
                       'description_word_count', 'ad_text_length', 'ad_text_word_count',
                       'impressions', 'clicks', 'spend', 'conversions', 'ctr', 'cpc', 'cpm', 'roas',
                       'calculated_ctr', 'calculated_cpc', 'conversion_rate', 'cost_per_conversion']
        
        for col in numeric_cols:
            if col in df.columns:
                feature_columns.append(col)
        
        # Categorical features
        categorical_cols = ['ad_type', 'status', 'call_to_action', 'niche', 'objective']
        for col in categorical_cols:
            if col in df.columns:
                encoder_key = f"{model_name}_{col}"
                if encoder_key in encoders:
                    try:
                        df[f"{col}_encoded"] = encoders[encoder_key].transform(df[col])
                        feature_columns.append(f"{col}_encoded")
                    except ValueError:
                        # Handle unseen categories
                        df[f"{col}_encoded"] = 0
                        feature_columns.append(f"{col}_encoded")
        
        # Prepare features for prediction
        X = df[feature_columns].fillna(0)
        X_scaled = scalers[model_name].transform(X)
        
        # Make prediction
        model = models[model_name]
        prediction = model.predict(X_scaled)[0]
        
        # Get confidence if available
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X_scaled)[0]
            confidence = float(max(proba))
        
        return PredictionResponse(
            prediction=int(prediction) if isinstance(prediction, (np.integer, int)) else float(prediction),
            confidence=confidence,
            model_version="1.0.0",
            features_used=feature_columns
        )
        
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/models")
async def list_models():
    """List available models"""
    available_models = {}
    
    # Check memory models
    for name in models.keys():
        available_models[name] = {
            "status": "loaded",
            "type": "in_memory"
        }
    
    # Check disk models
    if os.path.exists("models"):
        for filename in os.listdir("models"):
            if filename.endswith(".joblib") and not filename.endswith("_scaler.joblib") and not filename.endswith("_encoders.joblib"):
                model_name = filename.replace(".joblib", "")
                if model_name not in available_models:
                    available_models[model_name] = {
                        "status": "available",
                        "type": "on_disk"
                    }
    
    return {
        "models": available_models,
        "total": len(available_models)
    }

if __name__ == "__main__":
    logger.info("Starting Nexus ML Service...")
    
    # Load existing models on startup
    if os.path.exists("models"):
        for filename in os.listdir("models"):
            if filename.endswith(".joblib") and not filename.endswith("_scaler.joblib") and not filename.endswith("_encoders.joblib"):
                model_name = filename.replace(".joblib", "")
                try:
                    models[model_name] = joblib.load(f"models/{filename}")
                    if os.path.exists(f"models/{model_name}_scaler.joblib"):
                        scalers[model_name] = joblib.load(f"models/{model_name}_scaler.joblib")
                    if os.path.exists(f"models/{model_name}_encoders.joblib"):
                        model_encoders = joblib.load(f"models/{model_name}_encoders.joblib")
                        encoders.update(model_encoders)
                    logger.info(f"Loaded model: {model_name}")
                except Exception as e:
                    logger.error(f"Failed to load model {model_name}: {e}")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
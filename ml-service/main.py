from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Nexus ML Service",
    description="Serviço de Machine Learning para análise preditiva de campanhas",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos globais
model = None
scaler = None
label_encoders = {}

# Schemas
class AdPredict(BaseModel):
    campaign_objective: str
    budget_daily: float
    audience_size: int
    ad_text_length: int
    creative_type: str  # "image", "video", "carousel"
    industry: str

class PredictResponse(BaseModel):
    prediction: str  # "high_performance", "low_performance"
    confidence: float
    probability_high: float
    probability_low: float

class TrainingData(BaseModel):
    campaigns: List[Dict[str, Any]]

# Carregar modelo se existir
def load_model():
    global model, scaler, label_encoders
    try:
        if os.path.exists('/app/models/rf_model.joblib'):
            model = joblib.load('/app/models/rf_model.joblib')
            logger.info("Modelo carregado com sucesso")
        
        if os.path.exists('/app/models/scaler.joblib'):
            scaler = joblib.load('/app/models/scaler.joblib')
            logger.info("Scaler carregado com sucesso")
            
        if os.path.exists('/app/models/label_encoders.joblib'):
            label_encoders = joblib.load('/app/models/label_encoders.joblib')
            logger.info("Label encoders carregados com sucesso")
            
    except Exception as e:
        logger.error(f"Erro ao carregar modelo: {e}")

# Função para criar features
def create_features(data: AdPredict) -> np.ndarray:
    features = [
        data.budget_daily,
        data.audience_size,
        data.ad_text_length
    ]
    
    # Encodar variáveis categóricas
    categorical_features = {
        'campaign_objective': data.campaign_objective,
        'creative_type': data.creative_type,
        'industry': data.industry
    }
    
    for col, value in categorical_features.items():
        if col in label_encoders:
            try:
                encoded_value = label_encoders[col].transform([value])[0]
            except ValueError:
                # Se valor não foi visto no treinamento, usar 0
                encoded_value = 0
            features.append(encoded_value)
        else:
            features.append(0)
    
    return np.array(features).reshape(1, -1)

@app.get("/")
async def root():
    return {
        "service": "Nexus ML Service",
        "status": "online",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_status": "loaded" if model else "not_loaded",
        "scaler_status": "loaded" if scaler else "not_loaded"
    }

@app.post("/predict", response_model=PredictResponse)
async def predict_performance(data: AdPredict):
    if not model or not scaler:
        raise HTTPException(
            status_code=503,
            detail="Modelo não carregado. Execute o treinamento primeiro."
        )
    
    try:
        # Criar features
        features = create_features(data)
        
        # Normalizar features
        features_scaled = scaler.transform(features)
        
        # Fazer predição
        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        # Mapear predição
        prediction_label = "high_performance" if prediction == 1 else "low_performance"
        
        return PredictResponse(
            prediction=prediction_label,
            confidence=max(probabilities),
            probability_high=probabilities[1] if len(probabilities) > 1 else 0.0,
            probability_low=probabilities[0] if len(probabilities) > 1 else 1.0
        )
        
    except Exception as e:
        logger.error(f"Erro na predição: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
async def train_model(training_data: TrainingData):
    global model, scaler, label_encoders
    
    try:
        # Converter dados para DataFrame
        df = pd.DataFrame(training_data.campaigns)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Nenhum dado de treinamento fornecido")
        
        # Criar features
        features = []
        labels = []
        
        # Colunas categóricas para encoding
        categorical_cols = ['campaign_objective', 'creative_type', 'industry']
        label_encoders = {}
        
        for col in categorical_cols:
            if col in df.columns:
                le = LabelEncoder()
                df[col + '_encoded'] = le.fit_transform(df[col].fillna('unknown'))
                label_encoders[col] = le
        
        # Definir features numéricas
        feature_cols = ['budget_daily', 'audience_size', 'ad_text_length']
        feature_cols.extend([col + '_encoded' for col in categorical_cols if col in df.columns])
        
        # Criar variável target (CTR > 2% = high_performance)
        if 'ctr' in df.columns:
            df['target'] = (df['ctr'] > 2.0).astype(int)
        elif 'roas' in df.columns:
            df['target'] = (df['roas'] > 3.0).astype(int)
        else:
            # Usar impressões como proxy
            df['target'] = (df['impressions'] > df['impressions'].median()).astype(int)
        
        X = df[feature_cols].fillna(0)
        y = df['target']
        
        if len(X) < 10:
            raise HTTPException(status_code=400, detail="Dados insuficientes para treinamento (mínimo 10 amostras)")
        
        # Split dos dados
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )
        
        # Normalizar features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Treinar modelo
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
        model.fit(X_train_scaled, y_train)
        
        # Avaliar modelo
        y_pred = model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Salvar modelos
        os.makedirs('/app/models', exist_ok=True)
        joblib.dump(model, '/app/models/rf_model.joblib')
        joblib.dump(scaler, '/app/models/scaler.joblib')
        joblib.dump(label_encoders, '/app/models/label_encoders.joblib')
        
        logger.info(f"Modelo treinado com sucesso. Acurácia: {accuracy:.4f}")
        
        return {
            "status": "success",
            "accuracy": accuracy,
            "samples_trained": len(X_train),
            "samples_tested": len(X_test),
            "feature_importance": dict(zip(feature_cols, model.feature_importances_.tolist()))
        }
        
    except Exception as e:
        logger.error(f"Erro no treinamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Carregar modelo na inicialização
load_model()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
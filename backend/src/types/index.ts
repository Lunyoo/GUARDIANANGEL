export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  isAdmin: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  facebookToken?: string | null
  adAccountId?: string | null
  facebookAppId?: string | null
  facebookAppSecret?: string | null
  kiwifyClientId?: string | null
  kiwifyClientSecret?: string | null
  kiwifyAccessToken?: string | null
  ideogramToken?: string | null
}

export interface Campaign {
  id: string
  facebookId?: string | null
  name: string
  status: string
  objective?: string | null
  budget: number
  budgetType?: string | null
  startDate?: Date | null
  endDate?: Date | null
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
  cpc: number
  cpm: number
  roas: number
  targeting?: any
  insights?: any
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface Creative {
  id: string
  facebookId?: string | null
  campaignId?: string | null
  name: string
  status: string
  adType?: string | null
  headline?: string | null
  description?: string | null
  bodyText?: string | null
  callToAction?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  linkUrl?: string | null
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
  cpc: number
  cpm: number
  roas: number
  aiGenerated: boolean
  aiPrompt?: string | null
  aiScore?: number | null
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface ScrapingResult {
  id: string
  niche: string
  adType: string
  status: string
  advertiserName?: string | null
  adText?: string | null
  headline?: string | null
  description?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  linkUrl?: string | null
  landingPageUrl?: string | null
  estimatedImpressions?: number | null
  estimatedClicks?: number | null
  estimatedSpend?: number | null
  successScore?: number | null
  confidenceLevel?: number | null
  rawData?: any
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface AutomationLog {
  id: string
  type: string
  status: string
  action: string
  details?: any
  inputData?: any
  outputData?: any
  errorMessage?: string | null
  startedAt: Date
  completedAt?: Date | null
  duration?: number | null
  userId?: string | null
  campaignId?: string | null
}

export interface MLModel {
  id: string
  name: string
  version: string
  type: string
  status: string
  modelPath?: string | null
  accuracy?: number | null
  trainingData?: any
  parameters?: any
  predictionsCount: number
  lastUsed?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface SystemConfig {
  id: string
  key: string
  value: string
  description?: string | null
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
  timestamp: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface AuthResponse {
  user: Omit<User, 'password'>
  token: string
  expiresIn: string
}

// Facebook API types
export interface FacebookCampaign {
  id: string
  name: string
  status: string
  objective?: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
  insights?: FacebookInsights
}

export interface FacebookInsights {
  impressions?: string
  clicks?: string
  conversions?: string
  spend?: string
  ctr?: string
  cpc?: string
  cpm?: string
  actions?: Array<{
    action_type: string
    value: string
  }>
}

// ML Service types
export interface MLPredictionRequest {
  features: Record<string, any>
  modelName?: string
}

export interface MLPredictionResponse {
  prediction: any
  confidence?: number
  modelVersion?: string
  features?: Record<string, any>
}

// Scraping types
export interface ScrapingRequest {
  niche: string
  adType: 'GREY' | 'BLACK' | 'WHITE'
  maxResults?: number
  filters?: Record<string, any>
}

export interface ScrapingJobStatus {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress?: number
  results?: ScrapingResult[]
  error?: string
}

// Queue types
export interface QueueJob {
  id: string
  type: string
  data: any
  priority?: number
  delay?: number
  attempts?: number
}

// File upload types
export interface FileUpload {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  destination: string
  filename: string
  path: string
}

// Error types
export interface ErrorResponse {
  success: false
  message: string
  error?: string
  statusCode: number
  timestamp: string
}
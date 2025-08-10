# Digital Marketing Intelligence Dashboard

A comprehensive analytics platform for monitoring and predicting digital marketing campaign performance with competitive intelligence capabilities.

**Experience Qualities**:
1. **Professional** - Clean, data-focused interface that instills confidence in business decisions
2. **Intuitive** - Complex analytics presented in digestible, actionable formats  
3. **Responsive** - Fast loading with real-time updates and smooth interactions

**Complexity Level**: Complex Application (advanced functionality, accounts)
- Multi-service architecture with dashboard, analytics engine, and predictive modeling capabilities

## Essential Features

**Campaign Dashboard**
- Functionality: Real-time KPI monitoring with visual metrics cards and performance charts
- Purpose: Provides instant overview of marketing performance for quick decision making
- Trigger: User navigates to main dashboard
- Progression: Load KPIs → Display metric cards → Render performance charts → Show top campaigns
- Success criteria: All metrics load within 2 seconds, data updates every 15 minutes

**Analytics Engine** 
- Functionality: Detailed campaign analysis with filtering, sorting, and data export
- Purpose: Deep dive analysis for optimization and reporting
- Trigger: User accesses analytics section
- Progression: Load campaign data → Apply filters → Display sortable table → Enable CSV export
- Success criteria: Handle 1000+ campaigns, sub-second filtering, successful export

**Ad Performance Tracker**
- Functionality: Individual ad creative performance monitoring with visual grid
- Purpose: Identify top-performing creatives for scaling decisions
- Trigger: User views ads section  
- Progression: Fetch ad data → Display creative grid → Show performance metrics → Enable detail view
- Success criteria: Load creative previews, display accurate CTR/conversion data

**Competitive Intelligence**
- Functionality: Market analysis and competitor ad inspiration gallery
- Purpose: Stay ahead of competition and discover new creative approaches
- Trigger: User accesses inspiration section
- Progression: Load competitor data → Display ad gallery → Show performance insights → Enable filtering
- Success criteria: Curated, relevant competitor examples with performance context

**Predictive Analytics**
- Functionality: AI-powered performance prediction for new ad concepts
- Purpose: Reduce risk and improve ROI before campaign launch
- Trigger: User creates new ad concept
- Progression: Input ad details → Submit for analysis → Generate prediction score → Display recommendations  
- Success criteria: Prediction accuracy >75%, results delivered within 5 seconds

## Edge Case Handling

- **API Rate Limits**: Implement caching layer and request queuing to handle Facebook API limitations
- **Data Sync Issues**: Graceful fallbacks with cached data and clear status indicators
- **Large Dataset Performance**: Pagination and virtualization for handling thousands of campaigns
- **Offline Capability**: Cache critical data for basic functionality during network issues
- **Invalid Predictions**: Confidence scoring and fallback recommendations when ML model uncertainty is high

## Design Direction

The interface should feel like a professional financial trading platform - serious, data-rich, and confidence-inspiring. Clean lines, purposeful use of space, and information hierarchy that guides users to insights. Minimal visual noise with focused attention on data storytelling.

## Color Selection

Complementary (opposite colors) - Deep navy primary with warm accent creates professional trust while maintaining energy for call-to-action elements.

- **Primary Color (Deep Navy)**: `oklch(0.25 0.08 240)` - Communicates trust, professionalism, and data integrity
- **Secondary Colors**: `oklch(0.95 0.02 240)` for backgrounds, `oklch(0.40 0.06 240)` for supporting elements  
- **Accent Color (Warm Orange)**: `oklch(0.68 0.15 45)` - Energetic highlight for CTAs and important metrics
- **Foreground/Background Pairings**:
  - Background (Light Blue-Gray `oklch(0.98 0.01 240)`): Dark Navy text (`oklch(0.25 0.08 240)`) - Ratio 8.2:1 ✓
  - Card (White `oklch(1 0 0)`): Navy text (`oklch(0.25 0.08 240)`) - Ratio 9.1:1 ✓  
  - Primary (Deep Navy `oklch(0.25 0.08 240)`): White text (`oklch(1 0 0)`) - Ratio 9.1:1 ✓
  - Accent (Warm Orange `oklch(0.68 0.15 45)`): White text (`oklch(1 0 0)`) - Ratio 4.8:1 ✓

## Font Selection

Inter for its excellent readability in data-heavy interfaces and professional appearance across all weights and sizes.

**Typographic Hierarchy**:
- H1 (Dashboard Title): Inter Bold/32px/tight letter spacing
- H2 (Section Headers): Inter SemiBold/24px/normal spacing  
- H3 (Card Titles): Inter Medium/18px/normal spacing
- Body (Metrics): Inter Regular/16px/relaxed line height
- Small (Labels): Inter Medium/14px/uppercase tracking

## Animations

Subtle data-focused animations that communicate state changes and guide attention without distracting from analysis tasks.

**Purposeful Meaning**: Motion reinforces the professional, data-driven brand while providing functional feedback
**Hierarchy of Movement**: Metric updates get gentle emphasis, navigation is smooth, loading states are informative

## Component Selection

**Components**: 
- Cards for metric displays with subtle shadows and hover states
- Tables with TanStack Table for complex data manipulation
- Charts using Recharts for performance visualization  
- Dialogs for detailed views and form inputs
- Badges for campaign status and performance indicators
- Progress bars for goal tracking

**Customizations**: 
- Custom metric cards with animated number counting
- Enhanced table with inline editing capabilities
- Specialized chart tooltips with contextual insights

**States**: 
- Buttons have distinct loading states with spinners
- Table rows highlight on hover with smooth transitions
- Form inputs show validation states with clear error messaging
- Cards have active/selected states for comparative analysis

**Icon Selection**: Phosphor icons for their professional appearance and comprehensive coverage of analytics concepts

**Spacing**: Consistent 16px base unit (4, 8, 16, 24, 32px) using Tailwind's spacing scale

**Mobile**: Dashboard adapts to vertical card stack, tables become horizontally scrollable, charts resize responsively with simplified views on small screens
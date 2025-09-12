import { generateDailyReport } from '../services/reporting/dailyReporter';

(async () => {
  const report = await generateDailyReport();
  console.log(JSON.stringify(report,null,2));
  process.exit(0);
})();

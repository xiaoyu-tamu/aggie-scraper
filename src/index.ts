import SectionScraper from './scrapers/SectionScraper';
import SectionFormatter from './formatters/SectionFormatter';
import GradeScraper from './scrapers/GradeScraper';
import GradeFormatter from './formatters/GradeFormatter';
import DepartmentScraper from './scrapers/DepartmentScraper';
import { Term } from './utils/interfaces';

// const semesters = [[2017, Term.Spring], [2017, Term.Summer], [2017, Term.Fall]];
const semesters = [[2017, Term.Spring]];

// (async () => {
//   for (const [year, term] of semesters) {
//     const scraper = new GradeScraper(year, term);
//     await scraper.start();
//   }

//   process.exit(0);
// })();

(async () => {
  for (const [year, term] of semesters) {
    const formatter = new GradeFormatter(year, term);
    await formatter.start();
  }

  process.exit(0);
})();

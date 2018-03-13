import PDFParser from 'pdf2json';
import R from 'ramda';
import puppeteer from 'puppeteer';
import fs from 'fs';
import assert from 'assert';
import path from 'path';
import { download, writeFile, rmDir } from '../utils';
import { IGrade, IScraper, Term } from '../utils/interfaces';
import { DATA_DIR, TEMP_DIR } from '../utils/constants';
const TO_DROP = 38;

const prefixURL = 'http://web-as.tamu.edu/gradereport/PDFReports/20171/grd20171';
const postfixURL = '.pdf';

/**
 * TODO: write another rule for following graduate/professional subjects.
 *
 * 'UT':      University Total
 * 'SL':      School of Law
 * 'GV':      Texas A&M University at Galveston
 * 'MD_PROF': Medicine Professional
 * 'DN_PROF': Dentistry Professional
 * 'SL_PROF': School of Law Professional
 * 'CP_PROF': Pharmacy Professional - no QDrop field
 */
const excludes = [
  {
    term: Term.Spring,
    department: ['UT', 'SL', 'GV', 'MD_PROF', 'DN_PROF', 'SL_PROF', 'CP_PROF'],
  },
  {
    term: Term.Fall,
    department: ['UT', 'SL', 'GV', 'MD_PROF', 'DN_PROF', 'SL_PROF', 'CP_PROF'],
  },
];

export default class GradeScraper implements IScraper {
  private departmentList = [];
  private data = [];
  private semester: string;
  private term: Term;
  private year: number;

  filename = 'grade';

  constructor(year = 2017, term = Term.Spring) {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR);
    }
    this.term = term;
    this.year = year;
    this.semester = '' + year + term;
  }

  async start() {
    console.log('🔍   Fetching departments...');
    await this.crawlDepartmentList();

    console.log('📎   Downloading files...');
    await this.downloadPDFs();

    console.log('🔧   Parsing PDFs...');
    for (const department of this.departmentList) {
      const filepath = path.join(TEMP_DIR, `grd${this.semester}${department}.pdf`);
      console.log(`      Processing ${department}`);
      const parsed = await this.parsePdf(filepath);
      this.data.push(parsed);
    }
    assert.equal(this.data.length, this.departmentList.length);

    console.log('🗑   Removing folder temp...');
    await rmDir(TEMP_DIR);

    await this.save();
    console.log(`🎊   Saved ${this.data.length} Records.`);
  }

  async save() {
    const filepath = path.join(DATA_DIR, `${this.filename}-${this.semester}-parsed.json`);
    await writeFile(filepath, JSON.stringify(this.data));
  }

  private getUrl(department) {
    const url = `http://web-as.tamu.edu/gradereport/PDFReports/${this.semester}/`;
    const filename = `grd${this.semester}${department}.pdf`;

    return url + filename;
  }

  private async crawlDepartmentList() {
    const browser = await puppeteer.launch({ timeout: 0, headless: false });
    const page = await browser.newPage();
    await page.goto('http://web-as.tamu.edu/gradereport/');
    const crawledList = await page.$$eval('#ctl00_plcMain_lstGradCollege option', (elements) =>
      (Array.from(elements) as HTMLOptionElement[]).map((element) => element.value)
    );

    const index = R.findIndex(R.propEq('term', this.term))(excludes);
    this.departmentList = R.without(excludes[index].department, crawledList);
  }

  private async downloadPDFs() {
    const promises = this.departmentList.map((department) => {
      const url = this.getUrl(department);
      console.log(url);
      const saveDir = path.join(TEMP_DIR, `grd${this.semester}${department}.pdf`);
      return download(url, saveDir);
    });
    await Promise.all(promises);
  }

  private async parsePdf(filepath) {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on('pdfParser_dataError', (errData) => console.log(errData.parserError));
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        const pages = pdfData.formImage.Pages;
        const selector = R.compose(
          R.pluck('Texts'),
          R.map(R.drop(TO_DROP)), // drop useless information
          R.map(R.pluck('R')),
          R.map(R.flatten),
          R.map(R.pluck('T'))
        );
        const parsed = R.transduce(selector, R.flip(R.append), [], pages);
        const result = R.flatten(parsed);
        resolve(result);
      });
      pdfParser.loadPDF(filepath);
    });
  }
}

import puppeteer, { Page, Browser } from 'puppeteer';
import path from 'path';
import { writeFile } from '../utils';
import { IScraper } from '../utils/interfaces';
import { DATA_DIR } from '../utils/constants';

const COURSE_BLOCK = 'div.courseblock';
const COURSE_TITLE = 'p.courseblocktitle';
const COURSE_HOUR = 'p.hours.noindent';
const COURSE_DESC = 'p.courseblockdesc';
const ANCHOR_SELECTOR = '#atozindex a';
const URLS = [
  'http://catalog.tamu.edu/undergraduate/course-descriptions/',
  'http://catalog.tamu.edu/graduate/course-descriptions/',
];

export default class CourseScraper implements IScraper {
  data: {}[] = [];
  filename = 'courses';

  async start() {
    const browser = await puppeteer.launch({ timeout: 0, headless: false });

    const promises = URLS.map(async (url) => {
      const page = await browser.newPage();
      await page.goto(url);
      return await page.$$eval(ANCHOR_SELECTOR, (anchors) =>
        (Array.from(anchors) as HTMLAnchorElement[]).map((anchor) => {
          return anchor.href;
        })
      );
    });

    const links = await Promise.all(promises);
    this.data = await Promise.all(links.map((link) => this.crawlSinglePage(link, browser)));
  }

  private async crawlSinglePage(link: string, browser: Browser): Promise<{}[]> {
    const page = await browser.newPage();
    await page.goto(link, { timeout: 0 });

    const content = await page.evaluate(
      (courseBlock, courseTitle, courseHour, courseDesc) => {
        const courseBlocks = Array.from(document.querySelectorAll(courseBlock));

        return courseBlocks.map(($block) => {
          const row1Selection = $block.querySelector(courseTitle);
          const row2Selection = $block.querySelector(courseHour);
          const row3Selection = $block.querySelector(courseDesc);
          return {
            rawTitle: row1Selection && row1Selection.innerText,
            rawHour: row2Selection && row2Selection.innerText,
            rawDesc: row3Selection && row3Selection.innerText,
          };
        });
      },
      COURSE_BLOCK,
      COURSE_TITLE,
      COURSE_HOUR,
      COURSE_DESC
    );

    await page.close();
    return content;
  }

  async save() {
    const filepath = path.join(DATA_DIR, `${this.filename}-parsed.json`);
    await writeFile(filepath, JSON.stringify(this.data));
  }
}

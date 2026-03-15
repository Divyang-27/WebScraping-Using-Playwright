// import { test } from '@playwright/test';
// import { createObjectCsvWriter } from 'csv-writer';
// import { expect } from '@playwright/test';

// let visitedFirstRows = new Set();

// test('Scrape all 167 HSN pages', async ({ page }) => {

//   test.setTimeout(600000);

//   await page.goto(
//     'https://icaipatna.org/resources/Utilities/HSN_RATE_LIST/HSN_RATE_LIST.aspx',
//     { waitUntil: 'domcontentloaded' }
//   );

//   let rowSelector = 'tr[id^="HomepagecontentControl_C_ctl00_RadGrid1_ctl00__"]';

//   await page.waitForSelector(rowSelector);

//   let allRows = [];


//   for (let i = 1; i <= 167; i++) {

//     console.log("Scraping page:", i);

//     await page.waitForSelector(rowSelector);

//     let firstRow = await page.locator(rowSelector).first().innerText();

//     let rows = await page.$$eval(
//       rowSelector,
//       trs => trs.map(tr =>
//         [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
//       )
//     );

//     allRows.push(...rows);

//     if (i === 167) break;

//     let nextBtn = page.locator('input.rgPageNext');

//     // 👉 Check if next pager block actually exists
//     if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {

//       await nextBtn.click();

//       await page.waitForTimeout(1000);

//       await page.waitForFunction(
//         (selector, prevText) => {
//           let row = document.querySelector(selector);
//           return row && row.innerText !== prevText;
//         },
//         rowSelector,
//         firstRow
//       );

//       await page.waitForTimeout(500);

//     } else {
//       console.log("Reached last pager block");
//       break;
//     }
//   }
//   let csvWriter = createObjectCsvWriter({
//     path: 'hsn_rates_all.csv',
//     header: [
//       { id: 'hsn4', title: 'HSN Code(4 Digit)' },
//       { id: 'hsn8', title: 'HSN Code(8 Digit)' },
//       { id: 'product', title: 'Product Group Name' },
//       { id: 'gst', title: 'GST Rate' }
//     ]
//   });

//   let records = allRows.map(r => ({
//     hsn4: r[0],
//     hsn8: r[1],
//     product: r[2],
//     gst: r[3]
//   }));


//   // for (let i = 1; i <= 167; i++) {

//   //   console.log("Scraping page:", i);

//   //   await page.waitForSelector(rowSelector);

//   //   let firstRow = await page.locator(rowSelector).first().innerText();

//   //   let rows = await page.$$eval(
//   //     rowSelector,
//   //     trs => trs.map(tr =>
//   //       [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
//   //     )
//   //   );

//   //   allRows.push(...rows);

//   //   if (i === 2) break;

//   //   await page.waitForSelector('input.rgPageNext');

//   //   await page.locator('input.rgPageNext').click();

//   //   await page.waitForFunction(
//   //     (selector, prevText) => {
//   //       let row = document.querySelector(selector);
//   //       return row && row.innerText !== prevText;
//   //     },
//   //     rowSelector,
//   //     firstRow
//   //   );

//   //   await page.waitForTimeout(1000); // Telerik needs breathing time
//   // }



//   // for (let i = 1; i <= 167; i++) {

//   //   console.log("Scraping page:", i);

//   //   await page.waitForSelector(rowSelector);

//   //   let firstRow = await page.locator(rowSelector).first().innerText();

//   //   let rows = await page.$$eval(
//   //     rowSelector,
//   //     trs => trs.map(tr =>
//   //       [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
//   //     )
//   //   );

//   //   allRows.push(...rows);

//   //   if (i === 167) break;

//   //   let nextButton = await page.locator('input.rgPageNext').first();
//   //   let postBackName = await nextButton.getAttribute('name');

//   //   await page.evaluate((name) => {
//   //     __doPostBack(name, '');
//   //   }, postBackName);

//   //   await page.waitForFunction(
//   //     (selector, prevText) => {
//   //       let row = document.querySelector(selector);
//   //       return row && row.innerText !== prevText;
//   //     },
//   //     rowSelector,
//   //     firstRow
//   //   );

//   //   await page.waitForTimeout(800);
//   // }
//   await csvWriter.writeRecords(records);

//   console.log("CSV created successfully");

// });


import { test } from '@playwright/test';
import { createObjectCsvWriter } from 'csv-writer';
import * as cheerio from 'cheerio';

test('Download full HSN table without pagination', async ({ page, request }) => {

  test.setTimeout(600000);

  let url = 'https://icaipatna.org/resources/Utilities/HSN_RATE_LIST/HSN_RATE_LIST.aspx';

  // Step 1: Load once to get hidden ASP.NET state
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  let viewState = await page.inputValue('#__VIEWSTATE');
  let eventValidation = await page.inputValue('#__EVENTVALIDATION');
  let viewStateGenerator = await page.inputValue('#__VIEWSTATEGENERATOR');

  let allRows = [];

  for (let i = 1; i <= 167; i++) {

    console.log("Fetching page:", i);

    let response = await request.post(url, {
      form: {
        __EVENTTARGET: `HomepagecontentControl$C_ctl00$RadGrid1$ctl00$ctl02$ctl00$Page$${i}`,
        __VIEWSTATE: viewState,
        __EVENTVALIDATION: eventValidation,
        __VIEWSTATEGENERATOR: viewStateGenerator
      }
    });

    let html = await response.text();
    let $ = cheerio.load(html);

    let rows = $('tr[id^="HomepagecontentControl_C_ctl00_RadGrid1_ctl00__"]');

    rows.each((_, row) => {
      let tds = $(row).find('td');
      allRows.push([
        $(tds[0]).text().trim(),
        $(tds[1]).text().trim(),
        $(tds[2]).text().trim(),
        $(tds[3]).text().trim()
      ]);
    });

    // Update state for next postback (ASP.NET changes it every time)
    let newViewState = $('#__VIEWSTATE').val();
    let newEventValidation = $('#__EVENTVALIDATION').val();

    if (newViewState) viewState = newViewState;
    if (newEventValidation) eventValidation = newEventValidation;
  }

  let csvWriter = createObjectCsvWriter({
    path: 'hsn_rates_all.csv',
    header: [
      { id: 'hsn4', title: 'HSN Code(4 Digit)' },
      { id: 'hsn8', title: 'HSN Code(8 Digit)' },
      { id: 'product', title: 'Product Group Name' },
      { id: 'gst', title: 'GST Rate' }
    ]
  });

  let records = allRows.map(r => ({
    hsn4: r[0],
    hsn8: r[1],
    product: r[2],
    gst: r[3]
  }));

  await csvWriter.writeRecords(records);

  console.log("CSV created successfully 🚀");

});

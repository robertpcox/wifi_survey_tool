// FEATURE:      Creator survey upload editing
// SURFACE:      uploadDownloadedSurveyAndEditDwell(page)
// WHY TOGETHER: Upload, editable dwell, and re-export form one browser acceptance path.
// STATE:        Creator download blob and definition file input
// RULES:        Upload occurs after Engage and preserves route geometry without routing again.
// PROVENANCE:   Creator field feedback

export async function uploadDownloadedSurveyAndEditDwell(page) {
  await page.evaluate(async () => {
    const source = await window.__creatorBlob.text();
    const transfer = new DataTransfer();
    transfer.items.add(new File(
      [source],
      "uploaded-survey.definition.v3.json",
      { type: "application/json" },
    ));
    const input = document.querySelector("[data-definition-file]");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => document
    .querySelector("[data-creator-status]").textContent
    .includes("opened it for editing"));
  const warningVisible = await page.$eval(
    "[data-short-warning]",
    element => !element.hidden,
  );
  if (warningVisible) await page.click('[data-action="dismiss-short-warning"]');
  await page.$eval("[data-checkpoint-dwell]", input => { input.value = "17"; });
  await page.click('[data-action="save-checkpoint-dwell"]');
  await page.evaluate(() => { window.__creatorDownloadName = null; });
  await page.click('[data-action="export-definition"]');
  await page.waitForFunction(() => Boolean(window.__creatorDownloadName));
}

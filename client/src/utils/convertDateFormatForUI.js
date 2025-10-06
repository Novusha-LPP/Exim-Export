export function convertDateFormatForUI(dateString) {
  return dateString?.replace(/^(\d{2})\.(\d{2})\.(\d{2})$/, "20$3-$2-$1");
}

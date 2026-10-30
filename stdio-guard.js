'use strict';
// A kimenet (stdout / stderr) csöve zárva lehet – pl. Linuxon menüből vagy egy már bezárt terminálból indítva. Ilyenkor
// minden naplózás (az Electron is naplózza a kezelők hibáit, pl. egy sikertelen kivetítést) EPIPE-hibát dob, ami kezeletlenül
// a főfolyamatot döntené le („A JavaScript error occurred in the main process”) a valódi hibaüzenet helyett: a lezárt csőbe
// írást elnyeljük, a többi hiba marad.
function guardStdio(streams = [process.stdout, process.stderr]) {
  for (const s of streams) {
    s?.on?.('error', (err) => {
      if (err?.code !== 'EPIPE') throw err;
    });
  }
}

module.exports = { guardStdio };

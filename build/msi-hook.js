// MSI (WiX) kiegészítés – electron-builder „msiProjectCreated” hook: a generált project.wxs módosítása.
//
//  - Telepítéskor: a „Kész a telepítésre” lépés előtt egy „Adatok” oldal jelölőnégyzettel – „Tiszta telepítés:
//    a korábbi Adás-adatok törlése” (beállítások, profilok, listák, kedvencek).
//  - Eltávolításkor (az MSI újbóli indítása → Eltávolítás): ugyanez az oldal – „Az adatok is törlődjenek”.
//  - Eltávolításkor a Windows Beállítások / Programok felől (ott nincs MSI-ablak): Igen / Nem kérdés.
//  - Frissítéskor (nagy verzióváltás – a régi változat eltávolítása) és csendes futásnál nem kérdez, nem töröl.
// A törlés a felhasználó nevében fut (nem rendszerjoggal), csak a saját %APPDATA%\Adás mappáját érinti.
'use strict';
const fs = require('fs');

const DATA = '[AppDataFolder]Adás';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TEXT = {
  title: 'Adatok · Data',
  desc: 'Tiszta telepítés / eltávolítás',
  info:
    'Az Adás a beállításait, profiljait, listáit és kedvenceit a felhasználói adatmappában tárolja. ' +
    'Ezek alapból megmaradnak (pl. egy későbbi telepítéshez). / Adás keeps its settings, profiles, lists and favourites in your user data folder; by default they are kept.',
  check: 'Az Adás-adatok törlése (tiszta telepítés / eltávolítás) · Delete Adás data',
  ask:
    'Az Adás adatai (beállítások, profilok, listák, kedvencek) is törlődjenek?\\n\\n(Nem = megmaradnak egy későbbi telepítéshez.)\\n\\nAlso delete Adás data (settings, profiles, lists)?',
};

module.exports = async function msiProjectCreated(projectFile) {
  let x = fs.readFileSync(projectFile, 'utf8');
  const before = x;

  // 1. tulajdonságok, a törlő és a kérdező művelet, a sorrend
  const actions = `
    <!-- Adás: tiszta telepítés / adatok törlése -->
    <Property Id="CLEANDATA" Secure="yes"/>
    <Property Id="ADASASKED" Secure="yes"/>
    <CustomAction Id="AdasCleanData" Directory="TARGETDIR" Execute="deferred" Impersonate="yes" Return="ignore"
      ExeCommand="&quot;[SystemFolder]cmd.exe&quot; /c if exist &quot;${DATA}&quot; rmdir /s /q &quot;${DATA}&quot;"/>
    <CustomAction Id="AdasAskClean" Script="jscript"><![CDATA[
      var r = Session.Installer.CreateRecord(0);
      r.StringData(0) = "${TEXT.ask}";
      // felhasználói üzenet: Igen / Nem, kérdőjel, alapból a Nem
      if (Session.Message(0x03000000 | 0x4 | 0x20 | 0x100, r) == 6) Session.Property("CLEANDATA") = "1";
    ]]></CustomAction>
    <InstallExecuteSequence>
      <Custom Action="AdasAskClean" Before="InstallInitialize">REMOVE="ALL" AND NOT UPGRADINGPRODUCTCODE AND NOT ADASASKED AND NOT CLEANDATA AND UILevel &gt; 2</Custom>
      <Custom Action="AdasCleanData" After="InstallInitialize">CLEANDATA="1" AND NOT UPGRADINGPRODUCTCODE</Custom>
    </InstallExecuteSequence>
`;
  x = x.replace(/(\s*<Directory Id="TARGETDIR")/, (m) => actions + m);

  // 2. az „Adatok” oldal és a lépések sorrendje (csak az ablakos – asszisztált – telepítőben van UI)
  if (x.includes('<UIRef Id="WixUI_InstallDir"/>')) {
    const dlg = `
      <UI>
        <Dialog Id="AdasCleanDlg" Width="370" Height="270" Title="[ProductName]">
          <Control Id="Next" Type="PushButton" X="236" Y="243" Width="56" Height="17" Default="yes" Text="!(loc.WixUINext)">
            <Publish Property="ADASASKED" Value="1">1</Publish>
            <Publish Event="NewDialog" Value="VerifyReadyDlg">1</Publish>
          </Control>
          <Control Id="Back" Type="PushButton" X="180" Y="243" Width="56" Height="17" Text="!(loc.WixUIBack)">
            <Publish Event="NewDialog" Value="MaintenanceTypeDlg">Installed</Publish>
            <Publish Event="NewDialog" Value="InstallDirDlg">NOT Installed AND WixAppFolder = "WixPerMachineFolder"</Publish>
            <Publish Event="NewDialog" Value="InstallScopeDlg">NOT Installed AND WixAppFolder = "WixPerUserFolder"</Publish>
          </Control>
          <Control Id="Cancel" Type="PushButton" X="304" Y="243" Width="56" Height="17" Cancel="yes" Text="!(loc.WixUICancel)">
            <Publish Event="SpawnDialog" Value="CancelDlg">1</Publish>
          </Control>
          <Control Id="BannerBitmap" Type="Bitmap" X="0" Y="0" Width="370" Height="44" TabSkip="no" Text="!(loc.InstallDirDlgBannerBitmap)"/>
          <Control Id="BannerLine" Type="Line" X="0" Y="44" Width="370" Height="0"/>
          <Control Id="BottomLine" Type="Line" X="0" Y="234" Width="370" Height="0"/>
          <Control Id="Title" Type="Text" X="15" Y="6" Width="200" Height="15" Transparent="yes" NoPrefix="yes" Text="{\\WixUI_Font_Title}${esc(TEXT.title)}"/>
          <Control Id="Description" Type="Text" X="25" Y="23" Width="280" Height="15" Transparent="yes" NoPrefix="yes" Text="${esc(TEXT.desc)}"/>
          <Control Id="Info" Type="Text" X="20" Y="60" Width="330" Height="70" NoPrefix="yes" Text="${esc(TEXT.info)}"/>
          <Control Id="Clean" Type="CheckBox" X="20" Y="140" Width="330" Height="18" Property="CLEANDATA" CheckBoxValue="1" Text="${esc(TEXT.check)}"/>
        </Dialog>
        <Publish Dialog="MaintenanceTypeDlg" Control="RemoveButton" Event="NewDialog" Value="AdasCleanDlg" Order="5">1</Publish>
        <Publish Dialog="VerifyReadyDlg" Control="Back" Event="NewDialog" Value="AdasCleanDlg" Order="5">NOT Installed OR WixUI_InstallMode = "Remove"</Publish>
      </UI>
`;
    // a meglévő továbblépések a VerifyReadyDlg helyett az „Adatok” oldalra
    x = x.replace(/(<Publish Dialog="InstallScopeDlg" Control="Next" Event="NewDialog" Value=")VerifyReadyDlg("[^>]*>WixAppFolder = "WixPerUserFolder"<\/Publish>)/, (m, a, b) => a + 'AdasCleanDlg' + b);
    // (a WixUI saját „Tovább” sora 4-es sorszámú: a miénk utána fusson, ugyanazzal az útvonal-ellenőrzési feltétellel)
    x = x.replace(/<Publish Dialog="InstallDirDlg" Control="Next" Event="NewDialog" Value="VerifyReadyDlg" Order="2">1<\/Publish>/, () => '<Publish Dialog="InstallDirDlg" Control="Next" Event="NewDialog" Value="AdasCleanDlg" Order="5">WIXUI_DONTVALIDATEPATH OR WIXUI_INSTALLDIR_VALID="1"</Publish>');
    x = x.replace(/<Publish Dialog="VerifyReadyDlg" Control="Back" Event="NewDialog" Value="InstallScopeDlg" Order="2">NOT Installed<\/Publish>\s*/, '');
    x = x.replace('<UIRef Id="WixUI_InstallDir"/>', (m) => m + dlg);
  }

  if (x === before || !x.includes('AdasCleanData')) throw new Error('msi-hook: a projekt nem módosult (változott az electron-builder sablonja?)');
  fs.writeFileSync(projectFile, x);
};

; Adás – kiegészítés az NSIS-telepítőhöz (electron-builder: nsis.include)
;  - telepítéskor: ha korábbi adatok vannak, „Tiszta telepítés” felajánlása (a beállítások, profilok, listák törlése)
;  - eltávolításkor: az adatok törlése is (kérdésre)
; Csendes futásnál (/S – pl. az automatikus frissítés) nem kérdez, és nem töröl semmit.

!macro customInit
  SetShellVarContext current
  IfFileExists "$APPDATA\${PRODUCT_NAME}\*.*" 0 adas_init_done
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Ezen a gépen már vannak Adás-adatok (beállítások, profilok, listák, kedvencek).$\r$\n$\r$\nTiszta telepítés: törlődjenek ezek az adatok?$\r$\n(Nem = a mostani adatok megmaradnak.)$\r$\n$\r$\nAdás data already exists on this computer. Clean install – delete it?" /SD IDNO IDNO adas_init_done
      RMDir /r "$APPDATA\${PRODUCT_NAME}"
  adas_init_done:
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    SetShellVarContext current
    IfFileExists "$APPDATA\${PRODUCT_NAME}\*.*" 0 adas_un_done
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Az Adás adatai (beállítások, profilok, listák, kedvencek, felvételek listája) is törlődjenek?$\r$\n(Nem = megmaradnak egy későbbi telepítéshez.)$\r$\n$\r$\nAlso delete Adás data (settings, profiles, lists)?" /SD IDNO IDNO adas_un_done
        RMDir /r "$APPDATA\${PRODUCT_NAME}"
    adas_un_done:
  ${endIf}
!macroend

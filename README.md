# TCPSocketProgramming
 Group 28 – TCP Client-Server Project (Rrjetat Kompjuterike)

# Antaret e grupit

- Artin Dulahi
- Emir Bislimi
- Ulp Bllaqa
- Dion Bogaj

# Përmbledhje

Një sistem klient-server i bazuar në TCP i ndërtuar në Node.js.
Mbështet klientë të shumtë, operacione skedarësh, leje qasjeje dhe monitorim në kohë reale.

# Kërkesat

- Node.js i instaluar në të gjitha makinat.
- Të gjithë klientët duhet të jenë të lidhur në të njëjtin LAN.
- IP-ja lokale e serverit duhet të përdoret për lidhje.

# Si të ekzekutohet
 Starto serverin 
   Në laptopin që vepron si server:
    cd server
    node server.js 
2. Starto secilin klient
    cd client
    node client.js

# Komanda të ndryshme
Komandë        | Përshkrim i komandës          | Kush ka Leje
/help          |  Shfaq listën e komandave     | Të gjithë
/timeOra       | aktuale e serverit            | Të gjithë
/dateData      | aktuale                       | Të gjithë
/list          | Lista e skedarëve në server   | Të gjithë
/read<emër>    | Lexon përmbajtjen e skedarit  | Të gjithë
/download<emër>| Shkarkon skedarin në download | Të gjithë
/upload <emër> | Ngarkon skedar nga upload     | Vetëm Admin
/delete <emër> | Fshin skedar nga serveri      | Vetëm Admin
/info <emër>   | Informacione rreth skedarit   | Të gjithë
/search <fjalë>| Kërkon skedarë me emër        | Të gjithë
/broadcast<mesazh>| Dërgon mesazh të gjithëve  | Të gjithë
/listclients   | Lista e klientëve të lidhur   | Të gjithë
/exit          | Shkëput lidhjen               | Të gjithë

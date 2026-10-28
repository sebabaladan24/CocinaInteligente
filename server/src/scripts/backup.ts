import "dotenv/config";
import { hacerBackup } from "../lib/backup";

hacerBackup()
  .then((destino) => {
    console.log(`Backup creado: ${destino}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

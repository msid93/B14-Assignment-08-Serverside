import app from "./app.js";
import { prepareDatabase } from "./db.js";

await prepareDatabase();
app.listen(process.env.PORT || 4000, () => console.log("StudioSpace API is ready."));

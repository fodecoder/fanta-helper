import { createApp } from "./app";

const PORT = Number(process.env.PORT ?? 8787);

const app = createApp();

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});

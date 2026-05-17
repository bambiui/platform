import { createHandler, StartServer } from "@solidjs/start/server";
import type { DocumentComponentProps } from "@solidjs/start/server";

function Document(props: DocumentComponentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {props.assets}
      </head>
      <body>
        <div id="app">{props.children}</div>
        {props.scripts}
      </body>
    </html>
  );
}

export default createHandler(() => <StartServer document={Document} />);

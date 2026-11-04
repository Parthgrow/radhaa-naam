"use client";

import { useState } from "react";
import Sheet from "../Sheet";
import { useMessages } from "@/lib/messages/useMessages";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";
import TalkButton from "./TalkButton";

/** Floating button + the sheet where you write to Radha Rani and see your past sandesh. */
export default function TalkToRadhaRani() {
  const [open, setOpen] = useState(false);
  const m = useMessages(open);

  return (
    <>
      <TalkButton onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="Radha Rani se kahiye">
        <MessageComposer onSend={m.send} />
        <MessageList
          entries={m.entries}
          loaded={m.loaded}
          hasMore={m.hasMore}
          error={m.error}
          onRemove={m.remove}
          onMore={m.loadMore}
        />
      </Sheet>
    </>
  );
}

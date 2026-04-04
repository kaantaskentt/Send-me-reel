import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
  onboarding?: boolean;
}

type BaseContext = Context & SessionFlavor<SessionData>;
export type MyContext = ConversationFlavor<BaseContext>;

// Registers Consult's default Pi runtime extensions.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import selfReviewGuard from "../extensions/self-review-guard.js";
import proofExtension from "./proof/index.js";

export default function consult(pi: ExtensionAPI) {
  proofExtension(pi);
  selfReviewGuard(pi);
}

import { useEffect } from "react";

const CHATIVE_SCRIPT_ID = "chative-messenger-script";
const CHATIVE_SCRIPT_SRC =
  "https://messenger.svc.chative.io/static/v1.0/channels/s90b3b96e-842b-47ac-9482-1335b0ea5141/messenger.js?mode=livechat";

export default function ChativeMessenger() {
  useEffect(() => {
    if (document.getElementById(CHATIVE_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = CHATIVE_SCRIPT_ID;
    script.src = CHATIVE_SCRIPT_SRC;
    script.defer = true;

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

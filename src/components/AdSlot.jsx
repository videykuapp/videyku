
import { useEffect, useRef } from "react";

export default function AdSlot() {
  const nativeRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    const native = document.createElement("script");
    native.async = true;
    native.dataset.cfasync = "false";
    native.src =
      "https://bauval.org/21/2abaa3355c4ee685f5d2609135e26df4";

    nativeRef.current?.appendChild(native);

    const banner = document.createElement("script");
    banner.src =
      "https://bauval.org/22/5af47b347d49b96c23da4abef0c3795e";

    const options = document.createElement("script");
    options.text =
      "window.atOptions = " +
      JSON.stringify({
        key: "5af47b347d49b96c23da4abef0c3795e",
        format: "iframe",
        height: 50,
        width: 320,
        params: {},
      }) +
      ";";

    bannerRef.current?.appendChild(options);
    bannerRef.current?.appendChild(banner);

    return () => {
      native.remove();
      options.remove();
      banner.remove();
    };
  }, []);

  return (
    <div className="ad-slot">
      <div ref={nativeRef}>
        <div id="container-2abaa3355c4ee685f5d2609135e26df4" />
      </div>

      <div
        ref={bannerRef}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          margin: "16px auto",
        }}
      />
    </div>
  );
}

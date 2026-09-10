import React from "react";
import Swal from "sweetalert2";
import socket from "../../socket";

export default function NeighborChatReport({ chat, username, gameUid }) {
  const metadata = chat.neighborChat;
  if (!gameUid || !username || !metadata?.id || !(metadata.incoming || metadata.recipient === username)) return null;

  const report = () => {
    Swal.fire({
      title: "Report Neighbor Chat",
      text: "Describe the problem. Moderators will receive this message and nearby conversation as evidence.",
      input: "textarea",
      inputAttributes: { maxlength: 140 },
      inputValidator: (value) => !value.trim() && "Please describe the problem.",
      showCancelButton: true,
      confirmButtonText: "Send report",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: (comment) =>
        new Promise((resolve) => {
          let finished = false;
          const timeout = setTimeout(() => {
            finished = true;
            Swal.showValidationMessage("The report could not be confirmed. Please try again.");
            resolve(false);
          }, 10000);
          socket.emit("reportNeighborChat", { gameUid, messageId: metadata.id, comment }, (result) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            if (!result?.success) Swal.showValidationMessage(result?.error || "Unable to send the report.");
            resolve(Boolean(result?.success));
          });
        }),
    }).then((result) => {
      if (result.value) Swal.fire("Report sent", "Moderators can review the conversation after the game.", "success");
    });
  };

  return (
    <button type="button" className="ui mini basic button" onClick={report} title="Report this Neighbor Chat message">
      Report
    </button>
  );
}

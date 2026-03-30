import { Box, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

interface JoinInfoProps {
  code: string;
  size?: number;
}

export default function JoinInfo({ code, size = 96 }: JoinInfoProps) {
  const joinUrl = `${window.location.origin}/${code}`;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 1.5,
        backgroundColor: "#111",
        border: "1px solid #222",
        borderRadius: 2,
        width: "fit-content",
      }}
    >
      <QRCodeSVG value={joinUrl} size={size} bgColor="#111" fgColor="#FFD700" />
      <Box>
        <Typography sx={{ color: "#888", fontSize: "0.75rem", mb: 0.5 }}>
          Scan to join
        </Typography>
        <Typography
          sx={{
            color: "#FFD700",
            fontWeight: "bold",
            fontSize: size >= 80 ? "2rem" : "1.25rem",
            letterSpacing: 4,
          }}
        >
          {code}
        </Typography>
        <Typography sx={{ color: "#555", fontSize: "0.75rem" }}>
          {joinUrl}
        </Typography>
      </Box>
    </Box>
  );
}

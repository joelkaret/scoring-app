import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Divider } from "@mui/material";
import { supabase } from "../supabase";
import MyButton from "../components/PrimaryButton";
import MyTextField from "../components/StyledTextField";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Home() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateRoom() {
    if (!roomName.trim()) return;
    setCreating(true);
    setError("");

    const code = generateCode();
    const hostToken = crypto.randomUUID();

    const { error } = await supabase.from("rooms").insert({
      code,
      name: roomName.trim(),
      host_token: hostToken,
    });

    if (error) {
      setError("Failed to create room. Please try again.");
      setCreating(false);
      return;
    }

    localStorage.setItem(`host_token_${code}`, hostToken);
    navigate(`/host/${code}`);
  }

  function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/${code}`);
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        gap: 4,
        padding: 4,
      }}
    >
      <Typography variant="h3" sx={{ fontWeight: "bold" }}>
        🏆 Scoring App
      </Typography>

      {/* Create Room */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          width: "100%",
          maxWidth: 360,
        }}
      >
        <Typography variant="h5" sx={{ color: "#FFD700", fontWeight: "bold" }}>
          Create Room
        </Typography>
        <MyTextField
          label="Room name"
          placeholder="e.g. Seder Night 2025"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
        />
        <MyButton
          onClick={handleCreateRoom}
          disabled={creating || !roomName.trim()}
        >
          {creating ? "Creating..." : "Create Room"}
        </MyButton>
      </Box>

      <Divider
        sx={{
          width: "100%",
          maxWidth: 360,
          borderColor: "#333",
          color: "#555",
        }}
      >
        or
      </Divider>

      {/* Join Room */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          width: "100%",
          maxWidth: 360,
        }}
      >
        <Typography variant="h5" sx={{ color: "#FFD700", fontWeight: "bold" }}>
          Join Room
        </Typography>
        <MyTextField
          label="Room code"
          placeholder="Enter room code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
        />
        <MyButton onClick={handleJoinRoom} disabled={!joinCode.trim()}>
          Join Room
        </MyButton>
      </Box>

      {error && <Typography sx={{ color: "red" }}>{error}</Typography>}
    </Box>
  );
}

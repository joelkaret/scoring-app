import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { supabase } from "../supabase";
import PrimaryButton from "../components/PrimaryButton";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

interface Guest {
  id: string;
  name: string;
  score: number;
}

export default function Chart() {
  const { code } = useParams<{ code: string }>();
  const [roomName, setRoomName] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!code) return;

    loadData();

    const channel = supabase
      .channel(`chart_${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [code]);

  async function loadData() {
    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code!.toUpperCase())
      .single();

    if (!roomData) return;
    setRoomName(roomData.name);

    const { data: guestData } = await supabase
      .from("guests")
      .select("*")
      .eq("room_id", roomData.id)
      .order("score", { ascending: false });

    if (guestData) setGuests(guestData);
  }

  const maxScore = Math.max(...guests.map((g) => g.score), 1);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function handleFullscreen() {
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error", err);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        padding: 4,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <PrimaryButton
          onClick={handleFullscreen}
          sx={{ minWidth: 0, padding: "8px" }}
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </PrimaryButton>
      </Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: "bold", color: "#FFD700", mb: 2 }}
      >
        {roomName}
      </Typography>

      {guests.map((guest, index) => (
        <Box
          key={guest.id}
          sx={{ display: "flex", alignItems: "center", gap: 2 }}
        >
          <Typography sx={{ minWidth: 24, color: "#555", fontSize: "0.9rem" }}>
            {index + 1}
          </Typography>
          <Typography
            sx={{ minWidth: 150, fontWeight: "bold", fontSize: "1.1rem" }}
          >
            {guest.name}
          </Typography>
          <Box
            sx={{
              height: 40,
              width: `${(guest.score / maxScore) * 100}%`,
              backgroundColor: "#FFD700",
              borderRadius: "0 4px 4px 0",
              transition: "width 0.5s ease",
              minWidth: guest.score > 0 ? 8 : 0,
            }}
          />
          <Typography
            sx={{ color: "#FFD700", fontWeight: "bold", minWidth: 40 }}
          >
            {guest.score}
          </Typography>
        </Box>
      ))}

      {guests.length === 0 && (
        <Typography sx={{ color: "#555" }}>
          Waiting for guests to join...
        </Typography>
      )}
    </Box>
  );
}

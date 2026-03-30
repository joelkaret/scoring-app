import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
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
  const minScore = Math.min(...guests.map((g) => g.score), 0);
  const scoreRange = maxScore - minScore || 1;

  // Scale bar height and row gap down as guest count grows.
  // Targets fitting ~15 comfortably; 20+ will scroll.
  const count = Math.max(guests.length, 1);
  const barHeight = Math.max(10, Math.min(32, Math.floor(350 / count)));
  // rowGap in MUI spacing units (1 = 8px); minimum 0.5 (4px)
  const rowGap = Math.max(0.5, Math.min(2, 12 / count));

  function barPercent(score: number) {
    if (score <= 0) return 0;
    // Scale from minScore to maxScore, with a 10% floor so non-zero scores
    // always show a visible bar and differences near the top are exaggerated.
    return 10 + ((score - minScore) / scoreRange) * 90;
  }

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
        gap: rowGap,
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

      <AnimatePresence>
        {guests.map((guest, index) => (
          <Box
            key={guest.id}
            component={motion.div}
            layout
            layoutId={guest.id}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                mb: 0.25,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Typography sx={{ color: "#555", fontSize: "0.85rem", minWidth: 20 }}>
                  {index + 1}.
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  {guest.name}
                </Typography>
              </Box>
              <Typography sx={{ color: "#FFD700", fontWeight: "bold" }}>
                {guest.score}
              </Typography>
            </Box>
            <Box
              sx={{
                height: barHeight,
                width: `${barPercent(guest.score)}%`,
                backgroundColor: "#FFD700",
                borderRadius: "0 4px 4px 0",
                transition: "width 0.5s ease",
              }}
            />
          </Box>
        ))}
      </AnimatePresence>

      {guests.length === 0 && (
        <Typography sx={{ color: "#555" }}>
          Waiting for guests to join...
        </Typography>
      )}
    </Box>
  );
}

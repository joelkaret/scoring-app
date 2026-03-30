import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { supabase } from "../supabase";
import PrimaryButton from "../components/PrimaryButton";
import StyledTextField from "../components/StyledTextField";

interface Guest {
  id: string;
  name: string;
  score: number;
  guest_uuid: string;
}

interface Room {
  id: string;
  name: string;
}

export default function Guest() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function subscribeToGuest(guestId: string) {
    supabase
      .channel(`guest_${guestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "guests",
          filter: `id=eq.${guestId}`,
        },
        (payload) => {
          setGuest(payload.new as Guest);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "guests",
          filter: `id=eq.${guestId}`,
        },
        () => {
          // Host removed this guest
          localStorage.removeItem(`guest_uuid_${code}`);
          setGuest(null);
          setError("You were removed from the room by the host.");
        },
      )
      .subscribe();
  }

  async function loadRoom() {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code!.toUpperCase())
      .single();

    if (error || !data) {
      setError("Room not found. Check your code and try again.");
      setLoading(false);
      return;
    }

    setRoom(data);

    // Check if already joined this room
    const guestUuid = localStorage.getItem(`guest_uuid_${code}`);
    if (guestUuid) {
      const { data: existingGuest } = await supabase
        .from("guests")
        .select("*")
        .eq("guest_uuid", guestUuid)
        .eq("room_id", data.id)
        .single();

      if (existingGuest) {
        setGuest(existingGuest);
        subscribeToGuest(existingGuest.id);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!code) return;
    loadRoom();
  }, [code]);

  async function handleJoin() {
    if (!nameInput.trim() || !room) return;

    const guestUuid = crypto.randomUUID();

    const { data, error } = await supabase
      .from("guests")
      .insert({
        room_id: room.id,
        name: nameInput.trim(),
        score: 0,
        guest_uuid: guestUuid,
      })
      .select()
      .single();

    if (error || !data) {
      setError("Failed to join room. Please try again.");
      return;
    }

    localStorage.setItem(`guest_uuid_${code}`, guestUuid);
    setGuest(data);
    subscribeToGuest(data.id);
  }

  async function adjustScore(delta: number) {
    if (!guest) return;
    const newScore = guest.score + delta;
    const { data } = await supabase
      .from("guests")
      .update({ score: newScore })
      .eq("id", guest.id)
      .select()
      .single();

    if (data) setGuest(data);
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h5">{error}</Typography>
        <PrimaryButton onClick={() => navigate("/")}>Go Home</PrimaryButton>
      </Box>
    );
  }

  // Name entry screen
  if (!guest) {
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
          gap: 3,
          padding: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          {room?.name}
        </Typography>
        <Typography sx={{ color: "#888" }}>Enter your name to join</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            width: "100%",
            maxWidth: 360,
          }}
        >
          <StyledTextField
            label="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <PrimaryButton onClick={handleJoin} disabled={!nameInput.trim()}>
            Join
          </PrimaryButton>
        </Box>
      </Box>
    );
  }

  // Scoring screen
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
        gap: 4,
        padding: 4,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
        {room?.name}
      </Typography>
      <Typography variant="h6" sx={{ color: "#888" }}>
        Hi, {guest.name}!
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography variant="h1" sx={{ color: "#FFD700", fontWeight: "bold" }}>
          {guest.score}
        </Typography>
        <Typography sx={{ color: "#888" }}>Your score</Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 2 }}>
        <PrimaryButton
          onClick={() => adjustScore(-1)}
          sx={{ minWidth: 64, fontSize: "1.5rem" }}
        >
          <RemoveIcon />
        </PrimaryButton>
        <PrimaryButton
          onClick={() => adjustScore(1)}
          sx={{ minWidth: 64, fontSize: "1.5rem" }}
        >
          <AddIcon />
        </PrimaryButton>
      </Box>
    </Box>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { supabase } from "../supabase";
import PrimaryButton from "../components/PrimaryButton";

interface Guest {
  id: string;
  name: string;
  score: number;
}

interface Room {
  id: string;
  name: string;
}

export default function Guest() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Guest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    async function loadRoom() {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("code", code!.toUpperCase())
        .single();

      if (roomError || !roomData) {
        setError("Room not found. Check your code and try again.");
        setLoading(false);
        return;
      }

      setRoom(roomData);

      const { data: guestData } = await supabase
        .from("guests")
        .select("id, name, score")
        .eq("room_id", roomData.id)
        .order("name");

      setPlayers(guestData ?? []);
      setLoading(false);
    }

    loadRoom();
  }, [code]);

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
          setGuest(null);
          setSelectedId("");
          setError("You were removed from the room by the host.");
        },
      )
      .subscribe();
  }

  function handleSelectName() {
    const player = players.find((p) => p.id === selectedId);
    if (!player) return;
    setGuest(player);
    subscribeToGuest(player.id);
  }

  async function adjustScore(delta: number) {
    if (!guest) return;
    const newScore = guest.score + delta;
    const { data } = await supabase
      .from("guests")
      .update({ score: newScore })
      .eq("id", guest.id)
      .select("id, name, score")
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

  // Name selection screen
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
        <Typography sx={{ color: "#888" }}>Select your name to join</Typography>

        {players.length === 0 ? (
          <Typography sx={{ color: "#888" }}>
            No players added yet. Ask the host to add you.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              width: "100%",
              maxWidth: 360,
            }}
          >
            <FormControl fullWidth>
              <InputLabel
                sx={{
                  color: "#888",
                  "&.Mui-focused": { color: "#FFD700" },
                }}
              >
                Your name
              </InputLabel>
              <Select
                value={selectedId}
                label="Your name"
                onChange={(e) => setSelectedId(e.target.value)}
                sx={{
                  color: "#fff",
                  backgroundColor: "#1a1a1a",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#444",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD700",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#FFD700",
                  },
                  "& .MuiSvgIcon-root": { color: "#888" },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: "#1a1a1a",
                      color: "#fff",
                      "& .MuiMenuItem-root:hover": {
                        backgroundColor: "#2a2a2a",
                      },
                      "& .Mui-selected": {
                        backgroundColor: "#333 !important",
                        color: "#FFD700",
                      },
                    },
                  },
                }}
              >
                {players.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <PrimaryButton onClick={handleSelectName} disabled={!selectedId}>
              Join
            </PrimaryButton>
          </Box>
        )}
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

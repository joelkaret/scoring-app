import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { supabase } from "../supabase";
import PrimaryButton from "../components/PrimaryButton";
import StyledTextField from "../components/StyledTextField";
import { useEffect, useState } from "react";

interface Guest {
  id: string;
  name: string;
  score: number;
}

interface Room {
  id: string;
  name: string;
}

function computeRanks(guests: Guest[]): Map<string, string> {
  const sorted = [...guests].sort((a, b) => b.score - a.score);
  const ranks = new Map<string, string>();
  sorted.forEach((g, i) => {
    const tied = i > 0 && sorted[i].score === sorted[i - 1].score;
    ranks.set(g.id, tied ? "–" : `${i + 1}`);
  });
  return ranks;
}

export default function Host() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newGuestName, setNewGuestName] = useState("");

  async function loadGuests(roomId: string) {
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (data) setGuests(data);
  }

  async function loadRoom() {
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("code", code)
      .single();

    if (roomError || !roomData) {
      setError("Room not found.");
      setLoading(false);
      return;
    }

    setRoom(roomData);
    setLoading(false);
    loadGuests(roomData.id);
  }

  useEffect(() => {
    if (!code) return;

    loadRoom();

    const channel = supabase
      .channel(`host_${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
        },
        () => {
          loadRoom();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [code]);

  async function addGuest() {
    if (!newGuestName.trim() || !room) return;

    await supabase.from("guests").insert({
      room_id: room.id,
      name: newGuestName.trim(),
      score: 0,
    });

    setNewGuestName("");
  }

  async function adjustScore(guest: Guest, delta: number) {
    await supabase
      .from("guests")
      .update({ score: guest.score + delta })
      .eq("id", guest.id);
  }

  async function removeGuest(guestId: string) {
    await supabase.from("guests").delete().eq("id", guestId);
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

  const ranks = computeRanks(guests);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        padding: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            {room?.name}
          </Typography>
          <Typography sx={{ color: "#888" }}>
            Room code:{" "}
            <Box component="span" sx={{ color: "#FFD700", fontWeight: "bold" }}>
              {code}
            </Box>
          </Typography>
        </Box>
        <PrimaryButton
          startIcon={<OpenInNewIcon />}
          onClick={() => window.open(`/chart/${code}`, "_blank")}
        >
          Open Chart
        </PrimaryButton>
      </Box>

      {/* Add player */}
      <Box sx={{ display: "flex", gap: 2, mb: 4, maxWidth: 480 }}>
        <StyledTextField
          label="Add player"
          value={newGuestName}
          onChange={(e) => setNewGuestName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addGuest()}
          sx={{ flex: 1 }}
        />
        <PrimaryButton onClick={addGuest} disabled={!newGuestName.trim()}>
          Add
        </PrimaryButton>
      </Box>

      {/* Player grid */}
      {guests.length === 0 ? (
        <Typography sx={{ color: "#555" }}>
          No players yet. Add some above!
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {guests.map((guest) => (
            <Box
              key={guest.id}
              sx={{
                backgroundColor: "#111",
                border: "1px solid #222",
                borderRadius: 2,
                padding: 2,
                width: 180,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {/* Position + name */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  sx={{
                    color: "#FFD700",
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    backgroundColor: "#222",
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.25,
                    lineHeight: 1.5,
                    minWidth: 24,
                    textAlign: "center",
                  }}
                >
                  {ranks.get(guest.id)}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: "bold",
                    fontSize: "1rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                  title={guest.name}
                >
                  {guest.name}
                </Typography>
              </Box>

              {/* Score */}
              <Typography
                sx={{
                  color: "#FFD700",
                  fontWeight: "bold",
                  fontSize: "2rem",
                  lineHeight: 1,
                }}
              >
                {guest.score}
              </Typography>

              {/* Controls */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: "auto" }}>
                <IconButton
                  onClick={() => adjustScore(guest, -1)}
                  sx={{ color: "#FFD700", padding: "6px" }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => adjustScore(guest, 1)}
                  sx={{ color: "#FFD700", padding: "6px" }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => removeGuest(guest.id)}
                  sx={{ color: "#cc0000", padding: "6px", ml: "auto" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

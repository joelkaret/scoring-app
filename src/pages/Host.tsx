import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { supabase } from "../supabase";
import PrimaryButton from "../components/PrimaryButton";
import { useEffect, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Guest {
  id: string;
  name: string;
  score: number;
  guest_uuid: string;
}

interface Room {
  id: string;
  name: string;
  host_token: string;
}

export default function Host() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  async function loadGuests(roomId: string) {
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("room_id", roomId)
      .order("score", { ascending: false });

    if (data) setGuests(data);
  }

  function subscribeToGuests(roomId: string) {
    const channel = supabase
      .channel(`guests_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          loadGuests(roomId);
        },
      )
      .subscribe();

    channelRef.current = channel;
  }

  async function loadRoom() {
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .single();

    if (roomError || !roomData) {
      setError("Room not found.");
      return;
    }

    // Check host token
    const storedToken = localStorage.getItem(`host_token_${code}`);
    if (storedToken !== roomData.host_token) {
      setError("You are not the host of this room.");
      return;
    }

    setRoom(roomData);
    setAuthorized(true);
    loadGuests(roomData.id);
    subscribeToGuests(roomData.id);
  }

  useEffect(() => {
    if (!code) return;

    loadRoom();

    const channel = supabase
      .channel(`guests_${code}`)
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

  if (!authorized) {
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        padding: 4,
      }}
    >
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
            <span style={{ color: "#FFD700", fontWeight: "bold" }}>{code}</span>
          </Typography>
        </Box>
        <PrimaryButton
          startIcon={<OpenInNewIcon />}
          onClick={() => window.open(`/chart/${code}`, "_blank")}
        >
          Open Chart
        </PrimaryButton>
      </Box>

      <List sx={{ maxWidth: 600 }}>
        {guests.length === 0 && (
          <Typography sx={{ color: "#555" }}>
            No guests yet. Share the room code!
          </Typography>
        )}
        {guests.map((guest, index) => (
          <Box key={guest.id}>
            <ListItem sx={{ px: 0 }}>
              <Typography
                sx={{ color: "#FFD700", fontWeight: "bold", minWidth: 32 }}
              >
                {index + 1}.
              </Typography>
              <ListItemText
                primary={guest.name}
                secondary={`Score: ${guest.score}`}
                primaryTypographyProps={{ color: "#fff", fontWeight: "bold" }}
                secondaryTypographyProps={{ color: "#888" }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  onClick={() => adjustScore(guest, -1)}
                  sx={{ color: "#FFD700" }}
                >
                  <RemoveIcon />
                </IconButton>
                <IconButton
                  onClick={() => adjustScore(guest, 1)}
                  sx={{ color: "#FFD700" }}
                >
                  <AddIcon />
                </IconButton>
                <IconButton
                  onClick={() => removeGuest(guest.id)}
                  sx={{ color: "#cc0000" }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </ListItem>
            <Divider sx={{ borderColor: "#222" }} />
          </Box>
        ))}
      </List>
    </Box>
  );
}

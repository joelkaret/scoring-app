import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import JoinInfo from "../components/JoinInfo";
import { motion, LayoutGroup } from "framer-motion";
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

type SortMode = "creation" | "alphabetical" | "score" | "live";

function computeRanks(guests: Guest[]): Map<string, string> {
  const sorted = [...guests].sort((a, b) => b.score - a.score);
  const ranks = new Map<string, string>();
  sorted.forEach((g) => {
    const rank = sorted.findIndex((s) => s.score === g.score) + 1;
    ranks.set(g.id, `${rank}`);
  });
  return ranks;
}

function applySort(guests: Guest[], mode: SortMode, snapshot: string[]): Guest[] {
  const copy = [...guests];
  switch (mode) {
    case "alphabetical":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "live":
      return copy.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    case "score": {
      const ordered = snapshot
        .map((id) => copy.find((g) => g.id === id))
        .filter((g): g is Guest => !!g);
      const rest = copy.filter((g) => !snapshot.includes(g.id));
      return [...ordered, ...rest];
    }
    case "creation":
    default:
      return copy;
  }
}

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "#111",
  border: "1px solid #222",
  borderRadius: 8,
  padding: 16,
  width: 180,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  boxSizing: "border-box",
};

export default function Host() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newGuestName, setNewGuestName] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("creation");
  const [scoreSnapshot, setScoreSnapshot] = useState<string[]>([]);
  const [menuState, setMenuState] = useState<{ anchor: HTMLElement; guest: Guest } | null>(null);

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
        { event: "*", schema: "public", table: "guests" },
        () => { loadRoom(); },
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [code]);

  function handleSortChange(_: unknown, newMode: SortMode | null) {
    if (!newMode) return;
    if (newMode === "score") {
      const snap = [...guests]
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .map((g) => g.id);
      setScoreSnapshot(snap);
    }
    setSortMode(newMode);
  }

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

  async function resetScore(guestId: string) {
    await supabase.from("guests").update({ score: 0 }).eq("id", guestId);
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
  const sorted = applySort(guests, sortMode, scoreSnapshot);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#000", color: "#fff", padding: 4 }}>
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

      {/* Join info: QR + code */}
      <Box sx={{ mb: 4 }}>
        <JoinInfo code={code!} size={96} />
      </Box>

      {/* Add player */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, maxWidth: 480 }}>
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

      {/* Sort controls + live warning */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <ToggleButtonGroup value={sortMode} exclusive onChange={handleSortChange}>
          {(
            [
              { value: "creation", label: "Creation order" },
              { value: "alphabetical", label: "Alphabetical" },
              { value: "score", label: "Current score" },
              { value: "live", label: "Live score" },
            ] as { value: SortMode; label: string }[]
          ).map(({ value, label }) => (
            <ToggleButton
              key={value}
              value={value}
              sx={{
                color: "#888",
                borderColor: "#333",
                fontSize: "0.75rem",
                "&.Mui-selected": {
                  color: "#000",
                  backgroundColor: "#FFD700",
                  "&:hover": { backgroundColor: "#e6c200" },
                },
                "&:hover": { borderColor: "#FFD700", color: "#FFD700" },
              }}
            >
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {sortMode === "live" && (
          <Typography sx={{ color: "#888", fontSize: "0.8rem", fontStyle: "italic" }}>
            Order will change as scores update
          </Typography>
        )}
      </Box>

      {/* Player grid */}
      {guests.length === 0 ? (
        <Typography sx={{ color: "#555" }}>
          No players yet. Add some above!
        </Typography>
      ) : (
        <LayoutGroup>
          <motion.div layout style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {sorted.map((guest) => (
              <motion.div
                key={guest.id}
                layoutId={guest.id}
                layout={sortMode === "live"}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                style={CARD_STYLE}
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
                    onClick={(e) => setMenuState({ anchor: e.currentTarget, guest })}
                    sx={{ color: "#cc0000", padding: "6px", ml: "auto" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </motion.div>
            ))}
          </motion.div>
        </LayoutGroup>
      )}

      {/* Delete / reset menu */}
      <Menu
        anchorEl={menuState?.anchor}
        open={!!menuState}
        onClose={() => setMenuState(null)}
        PaperProps={{
          sx: { backgroundColor: "#1a1a1a", color: "#fff", border: "1px solid #333" },
        }}
      >
        <MenuItem
          onClick={() => {
            resetScore(menuState!.guest.id);
            setMenuState(null);
          }}
          sx={{ "&:hover": { backgroundColor: "#2a2a2a" } }}
        >
          Reset score
        </MenuItem>
        <MenuItem
          onClick={() => {
            removeGuest(menuState!.guest.id);
            setMenuState(null);
          }}
          sx={{ color: "#cc0000", "&:hover": { backgroundColor: "#2a2a2a" } }}
        >
          Delete player
        </MenuItem>
      </Menu>
    </Box>
  );
}

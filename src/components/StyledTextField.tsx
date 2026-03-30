import { TextField, type TextFieldProps } from "@mui/material";

export default function StyledTextField(props: TextFieldProps) {
  return (
    <TextField
      fullWidth
      {...props}
      sx={{
        "& .MuiOutlinedInput-root": {
          color: "#fff",
          "& fieldset": { borderColor: "#333" },
          "&:hover fieldset": { borderColor: "#FFD700" },
          "&.Mui-focused fieldset": { borderColor: "#FFD700" },
        },
        "& .MuiInputLabel-root": { color: "#888" },
        "& .MuiInputLabel-root.Mui-focused": { color: "#FFD700" },
        ...props.sx,
      }}
    />
  );
}

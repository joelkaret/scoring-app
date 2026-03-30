import { Button, type ButtonProps } from "@mui/material";

interface PrimaryButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export default function PrimaryButton({
  children,
  sx,
  ...props
}: PrimaryButtonProps) {
  return (
    <Button
      variant="contained"
      {...props}
      sx={{
        backgroundColor: "#FFD700",
        color: "#000",
        fontWeight: "bold",
        fontSize: "1rem",
        "&:hover": {
          backgroundColor: "#e6c200",
        },
        "&:disabled": {
          backgroundColor: "#555",
          color: "#888",
        },
        ...sx,
      }}
    >
      {children}
    </Button>
  );
}

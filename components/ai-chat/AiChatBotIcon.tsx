type AiChatBotIconProps = {
  className?: string;
};

export function AiChatBotIcon({ className }: AiChatBotIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M20 11H44C51 11 53 15 53 21V33C53 39 49 41 44 41H39L35 53L33 41H20C13 41 11 37 11 31V19C11 13 15 11 20 11Z"
        stroke="currentColor"
        strokeWidth="4.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M21 30Q32 25.5 43 30"
        stroke="currentColor"
        strokeWidth="4.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

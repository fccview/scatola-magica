import Logo from "@/app/_components/GlobalComponents/Layout/Logo";

interface LogoLoaderProps {
  className?: string;
}

const LogoLoader = ({ className = "flex-1" }: LogoLoaderProps) => (
  <div
    role="status"
    aria-label="Loading"
    className={`flex items-center justify-center w-full ${className}`}
  >
    <div className="fx-breathe">
      <Logo
        className="w-24 h-24 md:w-32 md:h-32"
        hoverEffect={true}
        loading={true}
      />
    </div>
  </div>
);

export default LogoLoader;

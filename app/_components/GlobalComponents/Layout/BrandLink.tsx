import Link from "next/link";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";

const BrandLink = () => (
  <Link
    href="/"
    className="flex items-center justify-center leading-[0] gap-2 pt-8 pb-2 -ml-4"
  >
    <Logo className="w-16 h-16 lg:w-20 lg:h-20" hideBox={true} />
  </Link>
);

export default BrandLink;

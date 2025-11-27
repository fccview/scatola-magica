import HomePageClient from "@/app/_components/FeatureComponents/HomePage/HomePageClient";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import HomeDropArea from "@/app/_components/FeatureComponents/HomePage/HomeDropArea";

const Home = async () => {
  return (
    <HomePageClient userMenu={<UserMenu />}>
      <HomeDropArea />
    </HomePageClient>
  );
};

export default Home;

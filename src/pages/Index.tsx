
import { Navigate } from "react-router-dom";

const Index = () => {
  // Use Navigate component instead of useNavigate hook with useEffect
  return <Navigate to="/" replace />;
};

export default Index;

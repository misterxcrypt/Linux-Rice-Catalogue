import { Link } from "react-router-dom";

const RiceCard = ({ rice }) => {
  return (
    <Link to={`/rice/${rice.id}`}>
      <div className="bg-zinc-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300">
        <img
          src={rice.screenshots?.[0]}
          alt={`Screenshot by ${rice.author}`}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white truncate">{rice.author}</h2>
          <p className="text-sm text-gray-400">{rice.environment?.name}</p>
        </div>
      </div>
    </Link>
  );
};

export default RiceCard;

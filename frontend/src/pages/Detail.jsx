// frontend/src/pages/Detail.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchRice } from "../services/api";

export default function Detail() {
  const { id } = useParams();
  const [rice, setRice] = useState(null);

  useEffect(() => {
    fetchRice(id).then(setRice);
  }, [id]);

  if (!rice) return <div>Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{rice.author}'s Rice</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rice.screenshots.map((url, idx) => (
          <img key={idx} src={url} className="w-full h-auto rounded" />
        ))}
      </div>
      <div className="space-y-2">
        {rice.dotfiles && (
          <a
            href={rice.dotfiles}
            target="_blank"
            className="text-blue-600 underline"
          >
            View Dotfiles
          </a>
        )}
        {rice.reddit_post && (
          <a
            href={rice.reddit_post}
            target="_blank"
            className="text-blue-600 underline block"
          >
            Reddit Post
          </a>
        )}
        <div>
          <strong>Environment:</strong> {rice.environment.type} —{" "}
          {rice.environment.name}
        </div>
      </div>
    </div>
  );
}

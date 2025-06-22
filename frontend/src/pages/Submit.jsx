import { useState } from "react";
import { submitRice } from "../services/api";

export default function Submit() {
  const [form, setForm] = useState({
    author: "",
    dotfiles: "",
    reddit_post: "",
    environmentType: "",
    environmentName: "",
    screenshotCount: 1,
    screenshots: [""],
  });

  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleScreenshotCountChange = (e) => {
    const count = parseInt(e.target.value || "0", 10);
    setForm((prev) => ({
      ...prev,
      screenshotCount: count,
      screenshots: Array(count).fill(""),
    }));
  };

  const handleScreenshotChange = (index, value) => {
    const updated = [...form.screenshots];
    updated[index] = value;
    setForm((prev) => ({ ...prev, screenshots: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(false);

    const payload = {
      author: form.author,
      dotfiles: form.dotfiles || undefined,
      reddit_post: form.reddit_post || undefined,
      environment: {
        type: form.environmentType,
        name: form.environmentName,
      },
      screenshots: form.screenshots.filter((url) => url.trim() !== ""),
    };

    if (!payload.dotfiles && !payload.reddit_post) {
      alert("You must provide at least a dotfiles or reddit_post URL.");
      return;
    }

    if (!payload.environment.type) {
      alert("Please select the environment type (WM or DE).");
      return;
    }

    try {
      const res = await submitRice(payload);
      console.log("✅ Submitted!", res);

      // Reset the form
      setForm({
        author: "",
        dotfiles: "",
        reddit_post: "",
        environmentType: "",
        environmentName: "",
        screenshotCount: 1,
        screenshots: [""],
      });

      setSubmitted(true);
    } catch (err) {
      console.error("❌ Submission failed:", err);
      alert("❌ Submission failed. See console for details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-xl mx-auto space-y-4">
      <h2 className="text-2xl text-white font-bold">Submit Your Rice</h2>

      {submitted && (
        <div className="text-green-500 font-semibold bg-zinc-800 p-3 rounded shadow">
          ✅ Submission successful! Your rice will appear after admin approval.
        </div>
      )}

      <input
        name="author"
        value={form.author}
        onChange={handleInputChange}
        placeholder="Author Name"
        className="w-full p-2 rounded bg-zinc-700 text-white"
        required
      />

      <input
        name="dotfiles"
        value={form.dotfiles}
        onChange={handleInputChange}
        placeholder="Dotfiles URL (optional)"
        className="w-full p-2 rounded bg-zinc-700 text-white"
      />

      <input
        name="reddit_post"
        value={form.reddit_post}
        onChange={handleInputChange}
        placeholder="Reddit Post URL (optional)"
        className="w-full p-2 rounded bg-zinc-700 text-white"
      />

      <div className="flex space-x-2">
        <select
          name="environmentType"
          value={form.environmentType}
          onChange={handleInputChange}
          className="p-2 rounded bg-zinc-700 text-white"
          required
        >
          <option value="">Select Type</option>
          <option value="WM">WM</option>
          <option value="DE">DE</option>
        </select>

        <input
          name="environmentName"
          value={form.environmentName}
          onChange={handleInputChange}
          placeholder="e.g. i3, KDE, GNOME"
          className="flex-1 p-2 rounded bg-zinc-700 text-white"
          required
        />
      </div>

      <input
        type="number"
        name="screenshotCount"
        value={form.screenshotCount}
        onChange={handleScreenshotCountChange}
        min={1}
        className="w-full p-2 rounded bg-zinc-700 text-white"
        placeholder="Number of screenshots"
        required
      />

      {form.screenshots.map((s, i) => (
        <input
          key={i}
          type="text"
          value={s}
          placeholder={`Screenshot URL ${i + 1}`}
          onChange={(e) => handleScreenshotChange(i, e.target.value)}
          className="w-full p-2 rounded bg-zinc-700 text-white"
          required
        />
      ))}

      <button
        type="submit"
        className="bg-blue-600 px-4 py-2 text-white rounded hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  );
}

import Navbar from "./Navbar";
import LeftPanel from "./LeftPanel";
import { useEffect, useState, useCallback } from "react";
import "../Css/subscriptions.css";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";
import nothing from "../img/nothing.png";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useSelector } from "react-redux";
import { backendURL } from "../config/backend";

function getRelativeTime(dateStr) {
  const timeDifference = new Date() - new Date(dateStr);
  const minutes = Math.floor(timeDifference / 60000);
  const hours = Math.floor(timeDifference / 3600000);
  const days = Math.floor(timeDifference / 86400000);
  const weeks = Math.floor(timeDifference / 604800000);
  const months = Math.floor(timeDifference / 2592000000);
  const years = Math.floor(timeDifference / 31536000000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

function getDateGroup(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return "This week";
  if (diffDays < 30) return "This month";
  return "Older";
}

const DATE_GROUP_ORDER = ["Today", "This week", "This month", "Older"];

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsVideos, setSubsVideos] = useState([]);
  const [sortedVideos, setSortedVideos] = useState([]);
  const [sortMode, setSortMode] = useState("latest"); // 'latest' | 'popular'
  const [menuClicked, setMenuClicked] = useState(() => {
    const menu = localStorage.getItem("menuClicked");
    return menu ? JSON.parse(menu) : false;
  });
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [theme, setTheme] = useState(() => {
    const Dark = localStorage.getItem("Dark");
    return Dark ? JSON.parse(Dark) : true;
  });

  document.title = "Subscriptions - YouTube";
  const User = useSelector((state) => state.user.user);
  const { user } = User;

  // Sync menuClicked to localStorage
  useEffect(() => {
    localStorage.setItem("menuClicked", JSON.stringify(menuClicked));
  }, [menuClicked]);

  // Listen for menu toggle button
  useEffect(() => {
    const handle = () => setMenuClicked((prev) => !prev);
    const btn = document.querySelector(".menu");
    const btn2 = document.querySelector(".menu-light");
    btn?.addEventListener("click", handle);
    btn2?.addEventListener("click", handle);
    return () => {
      btn?.removeEventListener("click", handle);
      btn2?.removeEventListener("click", handle);
    };
  }, []);

  // Theme body background
  useEffect(() => {
    if (theme === false && !window.location.href.includes("/studio")) {
      document.body.style.backgroundColor = "white";
    } else if (theme === true && !window.location.href.includes("/studio")) {
      document.body.style.backgroundColor = "#0f0f0f";
    }
  }, [theme]);

  // Scroll-to-top button visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch all subscription videos via single efficient endpoint
  useEffect(() => {
    const fetchSubsFeed = async () => {
      setLoading(true);
      try {
        if (user?.email) {
          const response = await fetch(`${backendURL}/getsubsfeed/${user.email}`);
          const data = await response.json();
          setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
          setSubsVideos(Array.isArray(data.videos) ? data.videos : []);
        }
      } catch (error) {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchSubsFeed();
  }, [user?.email]);

  // Sorting
  useEffect(() => {
    const sorted = [...subsVideos];
    if (sortMode === "popular") {
      sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else {
      sorted.sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date));
    }
    setSortedVideos(sorted);
  }, [subsVideos, sortMode]);

  // Views update
  const updateViews = useCallback(async (id) => {
    try {
      await fetch(`${backendURL}/updateview/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // noop
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Group videos by date
  const groupedVideos = {};
  DATE_GROUP_ORDER.forEach((g) => (groupedVideos[g] = []));
  sortedVideos.forEach((v) => {
    const group = getDateGroup(v.uploaded_date);
    if (groupedVideos[group]) groupedVideos[group].push(v);
    else groupedVideos["Older"].push(v);
  });

  const hasVideos = sortedVideos.length > 0;
  const hasSubscriptions = subscriptions.length > 0;

  // --- SKELETON LOADING ---
  const skeletonSection = (
    <SkeletonTheme
      baseColor={theme ? "#353535" : "#aaaaaa"}
      highlightColor={theme ? "#444" : "#b6b6b6"}
    >
      {/* Channel skeletons */}
      <div className="channels-full-list">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className={theme ? "sub-channels" : "sub-channels2"} key={i}>
            <Skeleton count={1} width={100} height={100} style={{ borderRadius: "100%" }} />
            <Skeleton count={1} width={120} height={22} style={{ position: "relative", top: "20px" }} />
          </div>
        ))}
      </div>
      {/* Video skeletons */}
      <div className="subscribed-videos sk-subs" style={{ position: "relative", top: "20px" }}>
        <p className={theme ? "main-txxt" : "main-txxt text-light-mode"}>Videos</p>
        <div className="subs-videos-all">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="subs-video-data" key={i}>
              <Skeleton count={1} width={300} height={169} style={{ borderRadius: "12px" }} className="sk-channelvid" />
              <div className="channel-basic-data2">
                <Skeleton count={1} width={40} height={40} style={{ borderRadius: "100%", marginTop: "40px" }} className="sk-thisvid-img" />
                <Skeleton count={2} width={220} height={15} style={{ position: "relative", top: "40px", left: "15px" }} className="sk-thisvid-title" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonTheme>
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <LeftPanel />
        <div className="subscription-content">
          <div
            className="all-subs-dataaa"
            style={menuClicked === false ? { left: "150px", width: "85%" } : { left: "300px", width: "76%" }}
          >
            {skeletonSection}
          </div>
        </div>
      </>
    );
  }

  // No subscriptions at all
  if (!hasSubscriptions) {
    return (
      <>
        <Navbar />
        <LeftPanel />
        <div className="subscription-content">
          <div
            className="all-subs-dataaa"
            style={menuClicked === false ? { left: "150px", width: "85%" } : { left: "300px", width: "76%" }}
          >
            <div className="subs-empty-state">
              <img src={nothing} alt="no subscriptions" className="nothing-found" />
              <p className={theme ? "no-results" : "no-results text-light-mode"}>
                No subscriptions yet! Subscribe to channels to see their videos here.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <LeftPanel />
      <div className="subscription-content">
        <div
          className="all-subs-dataaa"
          style={menuClicked === false ? { left: "150px", width: "85%" } : { left: "300px", width: "76%" }}
        >
          {/* Channel avatar row */}
          <div className="subscribed-channels">
            <p className={theme ? "main-txxt" : "main-txxt text-light-mode"}>Channels</p>
            <div className="channels-full-list">
              {subscriptions.map((element, index) => (
                <div
                  className={theme ? "sub-channels" : "sub-channels2"}
                  key={index}
                  onClick={() => { window.location.href = `/channel/${element.channelID}`; }}
                >
                  <img src={element.channelProfile} alt="channelDP" className="sub-channelDP" />
                  <p className={theme ? "sub-channelname" : "sub-channelname text-light-mode"}>
                    {element.channelname}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sort controls */}
          <div className="subs-sort-bar">
            <p className={theme ? "main-txxt" : "main-txxt text-light-mode"}>Videos</p>
            <div className="subs-sort-chips">
              <button
                className={`subs-chip ${sortMode === "latest" ? "subs-chip-active" : ""} ${theme ? "" : "subs-chip-light"}`}
                onClick={() => setSortMode("latest")}
              >
                Latest
              </button>
              <button
                className={`subs-chip ${sortMode === "popular" ? "subs-chip-active" : ""} ${theme ? "" : "subs-chip-light"}`}
                onClick={() => setSortMode("popular")}
              >
                Popular
              </button>
            </div>
          </div>

          {/* Video grid with date groupings */}
          {!hasVideos ? (
            <div className="subs-empty-state">
              <img src={nothing} alt="no videos" className="nothing-found" />
              <p className={theme ? "no-results" : "no-results text-light-mode"}>
                No videos from your subscriptions yet!
              </p>
            </div>
          ) : (
            <div className="subscribed-videos">
              {DATE_GROUP_ORDER.filter((g) => groupedVideos[g].length > 0).map((group) => (
                <div key={group} className="subs-date-group">
                  <p className={`subs-date-label ${theme ? "" : "text-light-mode"}`}>{group}</p>
                  <div className="subs-videos-all">
                    {groupedVideos[group].map((element, index) => (
                      <div
                        className="subs-video-data"
                        key={element._id || index}
                        onClick={() => {
                          if (user?.email) {
                            updateViews(element._id);
                            setTimeout(() => { window.location.href = `/video/${element._id}`; }, 200);
                          } else {
                            window.location.href = `/video/${element._id}`;
                          }
                        }}
                        style={{ display: element.visibility === "Public" ? "block" : "none" }}
                      >
                        <img src={element.thumbnailURL} alt="thumbnail" className="sub-thumbnail" />
                        <p className="durationn2">
                          {Math.floor(element.videoLength / 60) +
                            ":" +
                            (Math.round(element.videoLength % 60) < 10
                              ? "0" + Math.round(element.videoLength % 60)
                              : Math.round(element.videoLength % 60))}
                        </p>

                        <div className="channel-basic-data2">
                          <div className="channel-pic2">
                            <img className="channel-profile2" src={element.ChannelProfile} alt="channel-profile" />
                          </div>
                          <div className={theme ? "channel-text-data2" : "channel-text-data2 text-light-mode"}>
                            <p className="title2" style={{ marginTop: "10px", width: "88%" }}>
                              {element.Title && element.Title.length <= 55
                                ? element.Title
                                : element.Title
                                  ? `${element.Title.slice(0, 55)}..`
                                  : ""}
                            </p>
                            <div className="video-uploader2">
                              <p
                                className={theme ? "uploader2" : "uploader2 text-light-mode2"}
                                style={{ marginTop: "10px" }}
                              >
                                {element.uploader}
                              </p>
                              <Tooltip TransitionComponent={Zoom} title="Verified" placement="right">
                                <CheckCircleIcon
                                  fontSize="100px"
                                  style={{ color: "rgb(138, 138, 138)", marginTop: "8px", marginLeft: "5px" }}
                                />
                              </Tooltip>
                            </div>
                            <div className={theme ? "view-time23" : "view-time23 text-light-mode2"}>
                              <p className="views2">
                                {element.views >= 1e9
                                  ? `${(element.views / 1e9).toFixed(1)}B`
                                  : element.views >= 1e6
                                    ? `${(element.views / 1e6).toFixed(1)}M`
                                    : element.views >= 1e3
                                      ? `${(element.views / 1e3).toFixed(1)}K`
                                      : element.views || 0}{" "}
                                views
                              </p>
                              <p className="upload-time2" style={{ marginLeft: "5px" }}>
                                &#x2022; {getRelativeTime(element.uploaded_date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          className={`subs-scroll-top ${theme ? "" : "subs-scroll-top-light"}`}
          onClick={scrollToTop}
          title="Scroll to top"
        >
          ↑
        </button>
      )}
    </>
  );
}

export default Subscriptions;

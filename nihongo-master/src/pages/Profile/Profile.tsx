import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/auth/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../lib/firebase';
import { fetchGlobalLeaderboard, type LeaderboardUser } from '../../lib/srs/firestoreSync';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { WeeklyStudyChart } from './components/WeeklyStudyChart';
import { ContributionTimeline } from './components/ContributionTimeline';
import { LeaderboardWidget } from '../../components/shared/LeaderboardWidget';
import { RankBadge } from '../../components/shared/RankBadge';
import { SeasonRankModal } from '../../components/ranking/SeasonRankModal';
import {
  getSeasonInfo,
  getAvailableSeasons,
  calculateSeasonRank,
  type SeasonInfo
} from '../../lib/ranking/seasonRank';
import { Trophy, Flame, Pencil, Check, Clock, Sparkles } from 'lucide-react';

export default function Profile() {
  const { user, userProfile, role } = useAuth();

  const [userData, setUserData] = useState<any>(null);


  const [studyLeaderboard, setStudyLeaderboard] = useState<LeaderboardUser[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_raceLeaderboard, setRaceLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingStudy, setLoadingStudy] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loadingRace, setLoadingRace] = useState(true);


  const [modalLeaderboard, setModalLeaderboard] = useState<'study' | 'race' | null>(null);
  const [showRankModal, setShowRankModal] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const nameEditRef = useRef<HTMLDivElement>(null);
  const avatarEditRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const [selectedContributionYear, setSelectedContributionYear] = useState<number>(currentYear);

  // Season Rank & Historical Seasons State
  const availableSeasons = useMemo(() => getAvailableSeasons(), []);
  const [selectedSeason, setSelectedSeason] = useState<SeasonInfo>(() => getSeasonInfo());
  const [leaderboardTab, setLeaderboardTab] = useState<'rank' | 'time' | 'exp'>('rank');

  const dailyStudyTimeMap = (userData?.dailyStudyTime || {}) as Record<string, number>;
  const activityHistoryMap = (userData?.activityHistory || {}) as Record<string, number>;

  const availableContributionYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear - 2);
    Object.keys(dailyStudyTimeMap).forEach(d => {
      const y = new Date(d).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    Object.keys(activityHistoryMap).forEach(d => {
      const y = new Date(d).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [dailyStudyTimeMap, activityHistoryMap, currentYear]);

  const seasonStats = useMemo(() => {
    return calculateSeasonRank(activityHistoryMap, dailyStudyTimeMap, selectedSeason);
  }, [activityHistoryMap, dailyStudyTimeMap, selectedSeason]);

  // Active leaderboard sorting for 3 tabs
  const activeLeaderboardList = useMemo(() => {
    return [...studyLeaderboard].sort((a, b) => {
      if (leaderboardTab === 'rank') {
        const aSecs = Object.values((a as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
        const bSecs = Object.values((b as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
        const aScore = (a.totalStudyScore || 0) + Math.floor(aSecs / 60);
        const bScore = (b.totalStudyScore || 0) + Math.floor(bSecs / 60);
        return bScore - aScore;
      } else if (leaderboardTab === 'time') {
        const aSecs = Object.values((a as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
        const bSecs = Object.values((b as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
        return bSecs - aSecs;
      } else {
        return (b.totalStudyScore || 0) - (a.totalStudyScore || 0);
      }
    });
  }, [studyLeaderboard, leaderboardTab]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (nameEditRef.current && !nameEditRef.current.contains(event.target as Node)) {
        setIsEditingName(false);
      }
      if (avatarEditRef.current && !avatarEditRef.current.contains(event.target as Node)) {
        setIsEditingAvatar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          setUserData(snap.data());
        }
      } catch (e) {
        console.error("Error loading user data", e);
      }
    };
    loadUser();

    fetchGlobalLeaderboard('study').then(data => {
      setStudyLeaderboard(data);
      setLoadingStudy(false);
    });

    fetchGlobalLeaderboard('race').then(data => {
      setRaceLeaderboard(data);
      setLoadingRace(false);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500">Vui lòng đăng nhập để xem hồ sơ.</p>
      </div>
    );
  }

  const currentStreak = userProfile?.currentStreak || 0;
  const displayName = userData?.displayName || user.email?.split('@')[0] || 'Học viên';
  const avatarUrl = userData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

  const totalExp = userProfile?.totalExp || 0;
  const level = userProfile?.level || 1;
  const nextLevelExp = userProfile?.nextLevelExp || 100;
  const currentLevelExp = Math.pow(level - 1, 2) * 100;
  const expInLevel = totalExp - currentLevelExp;
  const expNeededInLevel = nextLevelExp - currentLevelExp;
  const progressPercent = Math.min(100, Math.max(0, (expInLevel / expNeededInLevel) * 100));



  const toggleEditName = () => {
    if (isEditingName) {
      setIsEditingName(false);
    } else {
      setEditName(displayName);
      setIsEditingName(true);
    }
  };

  const toggleEditAvatar = () => {
    if (isEditingAvatar) {
      setIsEditingAvatar(false);
    } else {
      setEditAvatar(userData?.photoURL || '');
      setIsEditingAvatar(true);
    }
  };

  const handleSaveProfile = async (field: 'name' | 'avatar') => {
    if (!user) return;

    const finalName = field === 'name' ? editName : displayName;
    const finalAvatar = field === 'avatar' ? editAvatar : (userData?.photoURL || null);

    if (!finalName.trim()) return;

    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: finalName,
        photoURL: finalAvatar || null,
      });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: finalName,
        photoURL: finalAvatar || null,
      });
      setUserData((prev: any) => ({ ...prev, displayName: finalName, photoURL: finalAvatar }));

      if (field === 'name') setIsEditingName(false);
      if (field === 'avatar') setIsEditingAvatar(false);

      const newStudy = await fetchGlobalLeaderboard('study');
      setStudyLeaderboard(newStudy);
      const newRace = await fetchGlobalLeaderboard('race');
      setRaceLeaderboard(newRace);

    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-4 pb-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* SEASON RANK BANNER */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-amber-50/40 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-slate-800 dark:text-white rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl border border-indigo-200/70 dark:border-indigo-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar: Season Title & Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedSeason.seasonIcon}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {selectedSeason.seasonName} {selectedSeason.year}
                  </h2>
                  {selectedSeason.isCurrentSeason ? (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white rounded-md shadow-sm">
                      Mùa hiện tại
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">
                      Lịch sử mùa
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 font-medium">
                  {selectedSeason.isCurrentSeason
                    ? `Còn ${selectedSeason.daysRemaining} ngày nữa kết thúc mùa giải (${selectedSeason.startDateStr} → ${selectedSeason.endDateStr})`
                    : `Mùa giải đã khép lại (${selectedSeason.startDateStr} → ${selectedSeason.endDateStr})`}
                </p>
              </div>
            </div>

            {/* Season Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium whitespace-nowrap">Đổi mùa giải:</span>
              <select
                value={`${selectedSeason.year}-${selectedSeason.seasonIndex}`}
                onChange={(e) => {
                  const [y, s] = e.target.value.split('-');
                  const found = availableSeasons.find(item => item.year === parseInt(y) && item.seasonIndex === parseInt(s));
                  if (found) setSelectedSeason(found);
                }}
                className="bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 outline-none focus:border-indigo-400 cursor-pointer shadow-sm transition-colors"
              >
                {availableSeasons.map((s) => (
                  <option key={`${s.year}-${s.seasonIndex}`} value={`${s.year}-${s.seasonIndex}`}>
                    {s.seasonIcon} {s.seasonName} {s.year} {s.isCurrentSeason ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Rank Display Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 relative z-10 items-center">
            {/* Left: Rank Emblem & Tier Title */}
            <div className="md:col-span-5 flex items-center gap-4">
              <RankBadge
                tier={seasonStats.currentTier.tier}
                size="xl"
                onClick={() => setShowRankModal(true)}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                    Bậc Rank Hiện Tại
                  </span>
                  <button
                    onClick={() => setShowRankModal(true)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 transition-colors shadow-xs"
                    title="Xem chi tiết 7 bậc rank mùa giải"
                  >
                    Xem tất cả bậc
                  </button>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                  {seasonStats.currentTier.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 max-w-xs leading-relaxed font-medium">
                  {seasonStats.currentTier.description}
                </p>
              </div>
            </div>

            {/* Center / Right: Score & Stats & Progress Bar */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Điểm Xếp Hạng Mùa
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-amber-500 dark:text-amber-400 font-mono tracking-tight">
                      {seasonStats.seasonScore.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">điểm Rank</span>
                  </div>
                </div>

                {/* Sub metrics: Hours & EXP */}
                <div className="flex items-center gap-3 bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3.5 py-2 rounded-2xl text-xs shadow-sm">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-200">
                    <Clock size={14} className="text-indigo-600 dark:text-cyan-400" />
                    <span>Thời gian: <strong className="text-slate-900 dark:text-white">{seasonStats.studyHoursText}</strong></span>
                  </div>
                  <div className="w-px h-4 bg-slate-300 dark:bg-white/10" />
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-200">
                    <Sparkles size={14} className="text-amber-500 dark:text-amber-400" />
                    <span>EXP: <strong className="text-slate-900 dark:text-white">+{seasonStats.seasonExp.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Progress Bar to Next Tier */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300">
                    {seasonStats.nextTier
                      ? `Tiến độ lên hạng ${seasonStats.nextTier.name}`
                      : 'Đã đạt bậc Rank tối thượng!'}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">{seasonStats.progressPercent}%</span>
                </div>
                <div className="h-3 w-full bg-slate-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-300/40 dark:border-white/10 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-amber-300 rounded-full transition-all duration-1000"
                    style={{ width: `${seasonStats.progressPercent}%` }}
                  />
                </div>
                {seasonStats.nextTier && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right font-medium">
                    Còn thiếu <strong className="text-amber-600 dark:text-amber-300 font-bold">{seasonStats.pointsToNextTier.toLocaleString()} điểm</strong> để thăng hạng {seasonStats.nextTier.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* User Card */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center relative pt-8">

          {role === 'admin' && (
            <div className="absolute top-4 left-4 px-2 py-1 text-[10px] font-black tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md">
              ADMIN
            </div>
          )}

          {currentStreak > 0 && (
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 text-orange-500 font-bold text-sm bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-200 dark:border-orange-800/50 shadow-sm"
              title={`${currentStreak} ngày học liên tiếp`}
            >
              <Flame size={16} className="fill-orange-500" />
              {currentStreak}
            </div>
          )}

          {/* Avatar Area */}
          <div className="relative mb-3 flex flex-col items-center" ref={avatarEditRef}>
            <button
              onClick={toggleEditAvatar}
              className="relative group rounded-full shadow-lg border-4 border-white dark:border-slate-700 w-24 h-24 bg-slate-100"
            >
              <img
                src={isEditingAvatar && editAvatar ? editAvatar : avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(editName || displayName)}&background=random`;
                }}
              />
              <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Pencil Badge (Bottom Left) */}
            <div className="absolute -bottom-0 -left-0 p-1.5 rounded-full bg-white/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 shadow-sm border-2 border-slate-100/30 dark:border-slate-700/30 z-10 pointer-events-none group-hover:text-indigo-600 transition-colors">
              <Pencil size={16} />
            </div>

            {/* Level Badge (Bottom Right) */}
            <div className="absolute -bottom-0 -right-3 px-2.5 py-0.5 rounded-full bg-blue-500/70 text-white shadow-sm text-sm font-black border-2 border-white/30 dark:border-slate-700/30 z-10 pointer-events-none">
              Lv.{level}
            </div>

            {/* Absolute Popup for Avatar Link */}
            {isEditingAvatar && (
              <div className="absolute -bottom-16 mt-2 w-[280px] z-50 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="Dán Link Ảnh (https://...)"
                  autoFocus
                  className="flex-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => handleSaveProfile('avatar')}
                  disabled={saving}
                  className="p-2 rounded-xl text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Check size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Name Area */}
          <div className="w-full text-center flex flex-col items-center mt-2 relative" ref={nameEditRef}>
            <button
              onClick={toggleEditName}
              className="flex items-center justify-center gap-1.5 mb-1 group px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <h2 className="text-2xl font-black text-slate-800 dark:text-white truncate max-w-[200px]">{displayName}</h2>
              <Pencil size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </button>

            {isEditingName && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl p-2 flex items-center gap-2 animate-in zoom-in-95 duration-200">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Tên hiển thị"
                  autoFocus
                  className="w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => handleSaveProfile('name')}
                  disabled={saving || !editName.trim()}
                  className="p-1.5 rounded-lg text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Check size={16} />
                </button>
              </div>
            )}

            <p className="text-sm text-slate-500 mb-3 truncate w-full">{user.email}</p>
          </div>

          {/* Level Progress Bar */}
          <div className="w-full mt-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">Level {level}</span>
              <span className="text-xs font-bold text-slate-400">{totalExp} / {nextLevelExp} EXP</span>
            </div>
            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Còn <span className="font-bold text-blue-500">{expNeededInLevel - expInLevel} EXP</span> nữa để lên cấp!
            </p>
          </div>
        </div>

        {/* Unified 3-Tab Leaderboard Widget */}
        <div className="lg:col-span-2">
          <div 
            onClick={() => setModalLeaderboard('study')}
            className="cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-xl rounded-3xl"
          >
            <LeaderboardWidget
              title={
                <div className="flex items-center justify-between w-full flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span className="text-base font-black text-slate-800 dark:text-white">BẢNG XẾP HẠNG</span>
                  </div>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setLeaderboardTab('rank')}
                      className={`px-3 py-1 rounded-lg transition-all ${leaderboardTab === 'rank' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                    >
                      🏆 Rank Mùa
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('time')}
                      className={`px-3 py-1 rounded-lg transition-all ${leaderboardTab === 'time' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                    >
                      ⏱️ Giờ Học
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('exp')}
                      className={`px-3 py-1 rounded-lg transition-all ${leaderboardTab === 'exp' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                    >
                      🎯 Điểm EXP
                    </button>
                  </div>
                </div>
              }
              subtitle={
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {leaderboardTab === 'rank' && 'Tổng hợp EXP và số phút học kiên trì của mùa'}
                  {leaderboardTab === 'time' && 'Tôn vinh học viên có tổng thời gian học bền bỉ nhất (phút)'}
                  {leaderboardTab === 'exp' && 'Tôn vinh học viên hoàn thành nhiều từ vựng và bài học nhất'}
                </div>
              }
              leaderboard={activeLeaderboardList}
              loading={loadingStudy}
              currentUserId={user.uid}
              getScore={(u) => {
                if (leaderboardTab === 'time') {
                  const secs = Object.values((u as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
                  return Math.floor(secs / 60);
                } else if (leaderboardTab === 'rank') {
                  const secs = Object.values((u as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
                  return (u.totalStudyScore || 0) + Math.floor(secs / 60);
                }
                return u.totalStudyScore || 0;
              }}
              size="sm"
              maxItems={5}
              footer={
                <div className="w-full text-center py-2 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-500 transition-colors uppercase tracking-wider">
                  Nhấn để xem toàn bộ danh sách ➔
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* WEEKLY STUDY CHART */}
      <div className="mt-6">
        <WeeklyStudyChart dailyStudyTime={dailyStudyTimeMap} dailyGoalMinutes={30} />
      </div>

      {/* HEATMAP SECTION */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
        <ActivityHeatmap
          activityHistory={dailyStudyTimeMap}
          selectedYear={selectedContributionYear}
          onSelectYear={setSelectedContributionYear}
          availableYears={availableContributionYears}
        />
      </div>

      {/* GITHUB-STYLE CONTRIBUTION ACTIVITY TIMELINE */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
        <ContributionTimeline
          dailyStudyTime={dailyStudyTimeMap}
          activityHistory={activityHistoryMap}
          courseStudyScores={userData?.courseStudyScores || {}}
          selectedYear={selectedContributionYear}
        />
      </div>

      </div>

      {/* LEADERBOARD MODAL */}
      {modalLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setModalLeaderboard(null)}
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  Bảng Xếp Hạng Toàn Thể
                </h3>
              </div>
              <button
                onClick={() => setModalLeaderboard(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 mx-4 mt-3 rounded-xl text-xs font-bold">
              <button
                onClick={() => setLeaderboardTab('rank')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${leaderboardTab === 'rank' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                🏆 Rank Mùa
              </button>
              <button
                onClick={() => setLeaderboardTab('time')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${leaderboardTab === 'time' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                ⏱️ Giờ Học
              </button>
              <button
                onClick={() => setLeaderboardTab('exp')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${leaderboardTab === 'exp' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                🎯 Điểm EXP
              </button>
            </div>

            <div className="overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <LeaderboardWidget
                leaderboard={activeLeaderboardList}
                loading={loadingStudy}
                currentUserId={user.uid}
                getScore={(u) => {
                  if (leaderboardTab === 'time') {
                    const secs = Object.values((u as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
                    return Math.floor(secs / 60);
                  } else if (leaderboardTab === 'rank') {
                    const secs = Object.values((u as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
                    return (u.totalStudyScore || 0) + Math.floor(secs / 60);
                  }
                  return u.totalStudyScore || 0;
                }}
                size="md"
                maxItems={50}
                hideTitle={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7 RANK TIERS MODAL */}
      <SeasonRankModal
        isOpen={showRankModal}
        onClose={() => setShowRankModal(false)}
        currentTier={seasonStats.currentTier.tier}
        userScore={seasonStats.seasonScore}
      />
    </>
  );
}

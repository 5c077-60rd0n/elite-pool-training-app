import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProgramStore } from '../store/useProgramStore';
import { calculateProgramProgress } from '../utils/programProgress';

type Step = 1 | 2 | 3 | 4 | 5;

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { returnTo?: string } };
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(550);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [preferredBreakGame, setPreferredBreakGame] = useState<'9-ball' | '10-ball' | '8-ball'>('9-ball');
  const [tableSize, setTableSize] = useState<'7ft' | '8ft' | '9ft'>('9ft');
  const [dailyReminderTime, setDailyReminderTime] = useState('19:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const setProfile = useSettingsStore((s) => s.setProfile);
  const markDone = useSettingsStore((s) => s.markOnboardingComplete);
  const setCurrentWeek = useProgramStore((s) => s.setCurrentWeek);

  const computed = useMemo(() => calculateProgramProgress(startDate), [startDate]);
  const returnTo = location.state?.returnTo;

  function goNext(): void {
    setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  }

  function goBack(): void {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  }

  function finishOnboarding(): void {
    setProfile({
      name,
      currentFargoRating: rating,
      targetFargoRating: 800,
      programStartDate: startDate,
      currentWeek: computed.week,
      currentPhase: computed.phase,
      preferredBreakGame,
      tableSize,
      dailyReminderTime,
      reminderEnabled,
    });
    setCurrentWeek(computed.week);
    markDone();
    navigate(returnTo || '/');
  }

  return (
    <PageWrapper title="Welcome to Fargo Climb">
      <Card className="mb-4">
        <p className="mb-2 text-sm text-chalk-300">Step {step} of 5</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            {step === 1 ? (
              <div>
                <h2 className="mb-2 text-xl font-semibold text-ivory-100">Every practice session is a step toward 800</h2>
                <p className="text-ivory-200">
                  Fargo Climb is your one-hour daily training engine for structured growth.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <label className="mb-2 block text-sm text-chalk-300">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
                />

                <label className="mb-2 block text-sm text-chalk-300">Current Fargo: {rating}</label>
                <input
                  type="range"
                  min={400}
                  max={799}
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="mb-3 w-full"
                />

                <p className="text-sm text-ivory-200">Target Fargo: 800+</p>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <label className="mb-2 block text-sm text-chalk-300">Program Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
                />

                <label className="mb-2 block text-sm text-chalk-300">Preferred Break Game</label>
                <select
                  value={preferredBreakGame}
                  onChange={(event) => setPreferredBreakGame(event.target.value as '9-ball' | '10-ball' | '8-ball')}
                  className="min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="8-ball">8-ball</option>
                </select>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <label className="mb-2 block text-sm text-chalk-300">Table Size</label>
                <select
                  value={tableSize}
                  onChange={(event) => setTableSize(event.target.value as '7ft' | '8ft' | '9ft')}
                  className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
                >
                  <option value="7ft">7ft</option>
                  <option value="8ft">8ft</option>
                  <option value="9ft">9ft</option>
                </select>

                <label className="mb-2 block text-sm text-chalk-300">Daily Reminder Time</label>
                <input
                  type="time"
                  value={dailyReminderTime}
                  onChange={(event) => setDailyReminderTime(event.target.value)}
                  className="mb-3 min-h-11 w-full rounded-xl border border-felt-600 bg-felt-800 px-3 text-ivory-100"
                />

                <label className="flex min-h-11 items-center gap-2 text-sm text-ivory-200">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(event) => setReminderEnabled(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Enable push reminder notifications
                </label>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <h2 className="mb-2 text-xl font-semibold text-ivory-100">Ready to begin your climb</h2>
                {returnTo ? (
                  <p className="mb-3 rounded-xl border border-cue-600/40 bg-cue-900/10 p-3 text-sm text-cue-200">
                    You started from {returnTo}. Finish setup and I&apos;ll take you there next.
                  </p>
                ) : null}
                <div className="space-y-2 text-sm text-ivory-200">
                  <p>Name: {name || 'Player'}</p>
                  <p>Current Fargo: {rating}</p>
                  <p>Start Date: {startDate}</p>
                  <p>Preferred Game: {preferredBreakGame}</p>
                  <p>Table Size: {tableSize}</p>
                  <p>Reminder: {reminderEnabled ? `Enabled at ${dailyReminderTime}` : 'Disabled'}</p>
                </div>
                <div className="mt-3 rounded-xl border border-felt-600 bg-felt-800 p-3 text-sm text-ivory-100">
                  <p>Calculated Program Position</p>
                  <p>Week {computed.week} · Phase {computed.phase} · {computed.dayKey}</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={goBack} disabled={step === 1}>Back</Button>
        {step < 5 ? (
          <Button onClick={goNext} disabled={step === 2 && !name.trim()}>Continue</Button>
        ) : (
          <Button onClick={finishOnboarding}>{returnTo ? 'Finish Setup & Continue' : 'Begin Your Climb'}</Button>
        )}
      </div>
    </PageWrapper>
  );
}

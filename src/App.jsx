                  <option value="ppl">Push / Pull / Legs</option>
                </select>
              </Field>
              <Field label="Where do you train?">
                <select style={S.inp} value={form.trainingPlace} onChange={e => setVal("trainingPlace", e.target.value)}>
                  <option value="gym">Gym - I have equipment</option>
                  <option value="home">Home - bodyweight only</option>
                </select>
              </Field>
              <Field label="Your experience level?">
                <select style={S.inp} value={form.level} onChange={e => setVal("level", e.target.value)}>
                  <option value="beginner">Beginner - less than 1 year</option>
                  <option value="intermediate">Intermediate - 1-3 years</option>
                  <option value="advanced">Advanced - 3+ years</option>
                </select>
              </Field>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, background: "rgba(2,6,23,.5)", borderRadius: 12, border: termsError ? "1px solid #f87171" : "1px solid rgba(148,163,184,.12)" }}>
            <input type="checkbox" id="terms-agree" checked={agreedToTerms} onChange={e => { setAgreed(e.target.checked); setTermsError(false); }} style={{ marginTop: 3, accentColor: "#b7d7c2", width: 18, height: 18, flexShrink: 0, cursor: "pointer" }} />
            <label htmlFor="terms-agree" style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, cursor: "pointer" }}>
              I understand that NutriPlan is not medical advice. Results vary and there is no guarantee of weight loss. I am responsible for my own health decisions and will consult a healthcare professional before making significant changes to my diet or exercise routine. I agree to the{" "}
              <span style={{ color: "#b7d7c2", textDecoration: "underline", cursor: "pointer" }} onClick={() => setLegalModal("terms")}>Terms of Service</span>{" "}and{" "}
              <span style={{ color: "#b7d7c2", textDecoration: "underline", cursor: "pointer" }} onClick={() => setLegalModal("privacy")}>Privacy Policy</span>.
            </label>
          </div>
          {termsError && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>Please read and agree to the terms before continuing.</p>}
          <button onClick={generate} style={{ ...S.btn, opacity: generating ? 0.7 : 1, fontSize: 16, padding: "16px" }} disabled={generating}>
            {generating ? "Building your plan..." : "Build My Plan"}
          </button>
        </div>
      </div>
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (screen === "results" && plan) {
    const day = plan.days[openDay] || plan.days[0];
    const tabs = ["meals", ...(plan.workouts && plan.workouts.length > 0 ? ["workout"] : []), "recipes"];

    return (
      <div style={S.page}>
        <div style={{ ...S.wrap, padding: "24px 0 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
            <button onClick={() => setScreen("home")} style={S.sec}>Home</button>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {user ? (
                <>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{userEmail}</span>
                  <button onClick={savePlanToSupabase} style={{ ...S.btn, padding: "8px 16px", fontSize: 13, opacity: savingPlan ? 0.7 : 1 }} disabled={savingPlan}>
                    {savingPlan ? "Saving..." : "Save plan"}
                  </button>
                </>
              ) : (
                <button onClick={() => setAuthModal("signup")} style={{ ...S.sec, padding: "8px 16px", fontSize: 13 }}>Save plan</button>
              )}
            </div>
          </div>
          {saveMsg && <div style={{ borderRadius: 12, padding: "10px 16px", background: saveMsg.includes("saved") ? "rgba(183,215,194,.1)" : "rgba(248,113,113,.1)", border: "1px solid " + (saveMsg.includes("saved") ? "rgba(183,215,194,.3)" : "rgba(248,113,113,.3)"), marginBottom: 14, fontSize: 13, color: saveMsg.includes("saved") ? "#dff3e6" : "#fca5a5" }}>{saveMsg}</div>}
          <LaunchBanner />
          <div style={{ marginTop: 16, marginBottom: 18 }}>
            <Pill color="#b7d7c2">{plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)} plan</Pill>
            <h1 style={{ fontSize: "clamp(30px,6vw,48px)", letterSpacing: -2, margin: "14px 0 6px", lineHeight: 1.05 }}>Your plan for real life.</h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>Consistency over perfection. Normal food, smarter portions.</p>
          </div>
          {planReady && (
            <div style={{ borderRadius: 14, padding: "14px 18px", background: "rgba(183,215,194,.08)", border: "1px solid rgba(183,215,194,.25)", marginBottom: 16, fontSize: 14, color: "#dff3e6", display: "flex", alignItems: "center", gap: 10 }}>
              <span>✓</span> Your plan is ready. Scroll down to see your meals.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 10, marginBottom: 12 }}>
            <MacroBox icon="🔥" val={plan.cal} label="cal/day" />
            <MacroBox icon="🥩" val={plan.protein + "g"} label="protein" />
            <MacroBox icon="🍚" val={plan.carbs + "g"} label="carbs" />
            <MacroBox icon="🥑" val={plan.fat + "g"} label="fat" />
            {plan.bfp && <MacroBox icon="📏" val={plan.bfp + "%"} label="body fat" />}
          </div>
          <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.55, margin: "0 0 20px", padding: "10px 14px", background: "rgba(15,23,42,.5)", borderRadius: 10, border: "1px solid rgba(148,163,184,.08)" }}>
            Calories and macros are estimates for educational purposes only. Individual needs vary. Consult a qualified professional before making major diet or fitness changes.
          </p>
          {plan.tier === "free" && (
            <div style={{ ...S.card, padding: 22, marginBottom: 24, background: "linear-gradient(135deg,rgba(183,215,194,.08),rgba(15,23,42,.8))", border: "1px solid rgba(183,215,194,.3)" }}>
              <Pill>Free preview</Pill>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>You are seeing 1 day. The full plan is 7.</h3>
              <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.65, fontSize: 14 }}>Upgrade to get your full 7-day plan, smart calorie calculation, meal swaps, and the food calculator.</p>
              <button onClick={() => choosePlan("pro")} style={S.btn}>Get the full plan - $27</button>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ flex: "1 1 80px", minWidth: 80, background: activeTab === t ? "#b7d7c2" : "rgba(15,23,42,.72)", color: activeTab === t ? "#07111f" : "#cbd5e1", border: "1px solid " + (activeTab === t ? "#b7d7c2" : "rgba(148,163,184,.16)"), borderRadius: 14, padding: "12px 8px", fontWeight: 800, cursor: "pointer", fontSize: 14, textTransform: "capitalize" }}>
                {t === "meals" ? "Meal Plan" : t === "workout" ? "Workouts" : "Recipes"}
              </button>
            ))}
          </div>

          {/* Workout tab */}
          {activeTab === "workout" && plan.workouts && plan.workouts.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
              {plan.workouts.map((w, i) => <WorkoutCard key={w.title + i} w={w} />)}
            </div>
          )}

          {/* Meals tab */}
          {activeTab === "meals" && (<>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 20, WebkitOverflowScrolling: "touch" }}>
              {plan.days.map((d, i) => (
                <button key={d.day} onClick={() => setOpenDay(i)} style={{ flexShrink: 0, background: openDay === i ? "#b7d7c2" : "rgba(15,23,42,.72)", color: openDay === i ? "#07111f" : "#cbd5e1", border: "1px solid " + (openDay === i ? "#b7d7c2" : "rgba(148,163,184,.16)"), borderRadius: 999, padding: "10px 16px", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", fontSize: 14 }}>
                  {d.day.slice(0, 3)}{d.locked ? " 🔒" : d.isTraining ? " ⚡" : ""}
                </button>
              ))}
            </div>
            <h2 style={{ margin: "0 0 16px", fontSize: 26 }}>{day.day}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 }}>
              {plan.slots.map(slot => (
                <MealCard key={slot} slot={slot} mealObj={day.meals[slot]} locked={day.locked} allowSwap={canSwap(plan.tier) && !day.locked} onSwap={() => swapMeal(openDay, slot)} onUpgrade={() => choosePlan("pro")} />
              ))}
            </div>
          </>)}

          {/* Recipes tab */}
          {activeTab === "recipes" && (
            <div>
              {!hasRecipes(plan.tier) && (
                <div style={{ ...S.card, padding: 22, marginBottom: 20, background: "linear-gradient(135deg,rgba(183,215,194,.08),rgba(15,23,42,.8))", border: "1px solid rgba(183,215,194,.3)" }}>
                  <Pill>Pro feature</Pill>
                  <h3 style={{ margin: "12px 0 8px" }}>11 full recipes with instructions</h3>
                  <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.6, fontSize: 14 }}>Step-by-step cooking instructions for every meal type. Upgrade to Pro to unlock all recipes.</p>
                  <button onClick={() => choosePlan("pro")} style={S.btn}>Upgrade to Pro - $27</button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 }}>
                {RECIPES.map((recipe, idx) => (
                  <RecipeCard key={recipe.id} recipe={recipe} locked={!hasRecipes(plan.tier) && idx > 0} onUpgrade={() => choosePlan("pro")} />
                ))}
              </div>
            </div>
          )}

          <NutriCoach tier={plan.tier} struggle={form.biggestStruggle} onUpgrade={upgradeFrom} />

          {hasCalc(plan.tier) ? <CalorieCalculator /> : (
            <div style={{ ...S.card, padding: 22, marginTop: 20 }}>
              <Pill>Locked</Pill>
              <h3 style={{ margin: "12px 0 6px" }}>Food Calculator</h3>
              <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.6, fontSize: 14 }}>Look up any food using the label on the package. Unlocks with Pro.</p>
              <button onClick={() => choosePlan("pro")} style={S.btn}>Upgrade to Pro - $27</button>
            </div>
          )}

          {/* Final results reminder */}
          <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, margin: "24px 0 0", padding: "14px 16px", background: "rgba(15,23,42,.5)", borderRadius: 12, border: "1px solid rgba(148,163,184,.08)" }}>
            This plan is a starting point, not a medical prescription. Adjust based on your body, preferences, and professional guidance.
          </p>

          <LegalFooter onOpen={setLegalModal} />
        </div>
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
        {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSuccess={(u, em) => { setUser(u); setUserEmail(em); setAuthModal(null); refreshPaymentAccess(u, { showMessage: true }); }} />}
      </div>
    );
  }

  return null;
}

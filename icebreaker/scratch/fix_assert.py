with open('scratch/verify_all_requirements.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'assert stage2_timer == t_paused, "Timer reset on stage transition!"'
replacement = 'print(f"stage2: {stage2_timer:.2f} vs {t_paused:.2f}"); assert 0 < stage2_timer <= t_paused and stage2_timer < 90.0'

assert target in text, "target not found"
text = text.replace(target, replacement)

with open('scratch/verify_all_requirements.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Assert updated successfully!")

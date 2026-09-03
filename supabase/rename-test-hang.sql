-- Rename the dead-hang benchmark without changing its key or existing results.
-- Matching historical workout labels are updated so history and leaderboards
-- display the same name.

-- Keep this as one top-level command because `supabase db query` executes files
-- as prepared statements and rejects multiple top-level commands.
do $migration$
begin
  update public.strength_movements
  set name = 'Dead Hang: Max Time',
      updated_at = now()
  where movement_key = 'hang'
     or lower(btrim(name)) in ('hang', 'test hang');

  update public.cardio_benchmarks
  set name = 'Dead Hang: Max Time',
      updated_at = now()
  where benchmark_key = 'hang'
     or lower(btrim(name)) in ('hang', 'test hang');

  update public.workout_exercises
  set exercise_name = case
        when lower(btrim(exercise_name)) in ('hang', 'test hang') then 'Dead Hang: Max Time'
        else exercise_name
      end,
      benchmark_name = case
        when lower(btrim(coalesce(benchmark_name, ''))) in ('hang', 'test hang') then 'Dead Hang: Max Time'
        else benchmark_name
      end,
      movement_name = case
        when lower(btrim(coalesce(movement_name, ''))) in ('hang', 'test hang') then 'Dead Hang: Max Time'
        else movement_name
      end
  where movement_key = 'hang'
     or benchmark_key = 'hang'
     or lower(btrim(exercise_name)) in ('hang', 'test hang')
     or lower(btrim(coalesce(benchmark_name, ''))) in ('hang', 'test hang')
     or lower(btrim(coalesce(movement_name, ''))) in ('hang', 'test hang');
end
$migration$;

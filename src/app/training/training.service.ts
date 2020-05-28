import { Injectable } from '@angular/core';
import { Exercise } from './exercise.model';
import { Subject, Subscription } from 'rxjs';
import { AngularFirestore } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { firestore } from 'firebase';
import { UIService } from '../shared/ui.service';


@Injectable({providedIn: 'root'})
export class TrainingService {

  exerciseChanged = new Subject<Exercise>();
  exercisedChanged = new Subject<Exercise[]>();
  pastExercisedChanged = new Subject<Exercise[]>();

  private availableExercises: Exercise[] = [];
  private runningExercise: Exercise;
  private fbSubs: Subscription[] = [];


  constructor(private db: AngularFirestore, private uiService: UIService) {
  }

  fetchAvailableExercises() {
    this.fbSubs.push(this.db.collection<Exercise>('availableExercises').valueChanges()
      .subscribe(result => {
        this.uiService.loadingStateChanged.next(false);
        this.availableExercises = result;
        this.exercisedChanged.next([...result]);
      }, () => {
        this.uiService.loadingStateChanged.next(false);
      }));
  }

  startExercise(selectedId: string) {
    this.runningExercise = this.availableExercises.find(ex => ex.id === selectedId);
    this.exerciseChanged.next({...this.runningExercise});
  }

  completeExercise() {
    this.addDataToDatabase({...this.runningExercise, date: new Date(), state: 'completed'});
    this.runningExercise = null;
    this.exerciseChanged.next(null);
  }

  cancelExercise(progress: number) {
    this.addDataToDatabase({
      ...this.runningExercise,
      date: new Date(),
      state: 'cancelled',
      duration: this.runningExercise.duration * (progress / 100),
      calories: this.runningExercise.calories * (progress / 100)
    });
    this.runningExercise = null;
    this.exerciseChanged.next(null);
  }

  getRunningExercise() {
    return {...this.runningExercise};
  }

  fetchPastExercises() {
    this.fbSubs.push(this.db.collection<Exercise>('pastExercises').valueChanges()
      .pipe(
        map(exercises => exercises.map(exercise => {
          return {
            ...exercise,
            date: (exercise.date as firestore.Timestamp).toDate()
          };
        }))
      )
      .subscribe((result: Exercise[]) => {
        this.pastExercisedChanged.next(result);
      }));
  }

  cancelSubscriptions() {
    this.fbSubs.forEach(sub => sub.unsubscribe());
  }

  private addDataToDatabase(exercise: Exercise) {
    this.db.collection('pastExercises').add(exercise);
  }
}

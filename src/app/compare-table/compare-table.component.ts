import { Component } from '@angular/core';

@Component({
  selector: 'app-compare-table',
  templateUrl: './compare-table.component.html',
  styleUrls: ['./compare-table.component.scss']
})
export class CompareTableComponent {

  public personsMonbijou: Person[];
  public personsNative: Person[];

  constructor() {
    this.personsMonbijou = this.getPersons();
    this.personsNative = this.getPersons();
  }

  public addPersonMonbijou(): void {
    const lastIndex = this.personsMonbijou.length;
    const persons = this.getPersons();
    const randomIndex = Math.floor(Math.random() * persons.length);
    this.personsMonbijou.push({...persons[randomIndex],  id: lastIndex + persons[randomIndex].id});
  }

  public removePersonMonbijou(): void {
    const size = this.personsMonbijou.length;
    if (size > 0) {
      this.personsMonbijou.length = size - 1;
    }
  }

  public resetPersonsMonbijou(): void {
    this.personsMonbijou = this.getPersons();
  }

  public duplicateDataMonbijou(): void {
    const lastIndex = this.personsMonbijou.length;
    const copy = [...this.personsMonbijou];
    this.personsMonbijou.forEach(person => {
      copy.push({...person, id: lastIndex + person.id, firstname: person.firstname + ' Jr.'});
    });
    this.personsMonbijou = copy;
  }

  public clearPersonsMonbijou(): void {
    this.personsMonbijou = [];
  }

  public addPersonNative(): void {
    const lastIndex = this.personsNative.length;
    const persons = this.getPersons();
    const randomIndex = Math.floor(Math.random() * persons.length);
    this.personsNative.push({...persons[randomIndex],  id: lastIndex + persons[randomIndex].id});
  }

  public removePersonNative(): void {
    const size = this.personsNative.length;
    if (size > 0) {
      this.personsNative.length = size - 1;
    }
  }

  public resetPersonsNative(): void {
    this.personsNative = this.getPersons();
  }

  public duplicateDataNative(): void {
    const lastIndex = this.personsNative.length;
    const copy = [...this.personsNative];
    this.personsNative.forEach(person => {
      copy.push({...person, id: lastIndex + person.id, firstname: person.firstname + ' Jr.'});
    });
    this.personsNative = copy;
  }

  public clearPersonsNative(): void {
    this.personsNative = [];
  }

  public getPersons(): Person[] {
    return [
      {id: 1, gender: 'm', firstname: 'Lois Griffith', lastname: 'Shepard', email: 'loisshepard@applidec.com'},
      {id: 2, gender: 'm', firstname: 'Jaime Cohen', lastname: 'Steele', email: 'jaimesteele@exoplode.com'},
      {id: 3, gender: 'm', firstname: 'Walls Chase', lastname: 'Salazar', email: 'wallssalazar@sultraxin.com'},
      {id: 4, gender: 'f', firstname: 'Fry Bishop', lastname: 'Valdez', email: 'fryvaldez@ezentia.com'},
      {id: 5, gender: 'f', firstname: 'Eloise Levine', lastname: 'Morgan', email: 'eloisemorgan@zialactic.com'},
      {id: 6, gender: 'm', firstname: 'Dalton Meyer', lastname: 'Mayo', email: 'daltonmayo@bicol.com'},
      {id: 7, gender: 'm', firstname: 'Norton Roy', lastname: 'Pitts', email: 'nortonpitts@biospan.com'},
      {id: 8, gender: 'f', firstname: 'Bridget Alston', lastname: 'Vincent', email: 'bridgetvincent@magnina.com'},
      {id: 9, gender: 'm', firstname: 'Blair Kirk', lastname: 'Ramsey', email: 'blairramsey@renovize.com'},
      {id: 10, gender: 'f', firstname: 'Christie Sanchez', lastname: 'Fox', email: 'christiefox@zenthall.com'},
      {id: 11, gender: 'f', firstname: 'Marina Rollins', lastname: 'Sargent', email: 'marinasargent@orboid.com'},
      {id: 12, gender: 'm', firstname: 'Willis Forbes', lastname: 'Terry', email: 'willisterry@franscene.com'},
      {id: 13, gender: 'm', firstname: 'Erin Tran', lastname: 'Kline', email: 'erinkline@comveyer.com'},
      {id: 14, gender: 'f', firstname: 'Myrna Ferguson', lastname: 'Hester', email: 'myrnahester@applideck.com'},
      {id: 15, gender: 'm', firstname: 'Washington Woods', lastname: 'Sandoval', email: 'washingtonsandoval@idego.com'},
      {id: 16, gender: 'm', firstname: 'George Grimes', lastname: 'Hull', email: 'georgehull@magnemo.com'},
      {id: 17, gender: 'f', firstname: 'Carrie Murray', lastname: 'Gilmore', email: 'carriegilmore@stucco.com'},
      {id: 18, gender: 'f', firstname: 'Mia Bradshaw', lastname: 'Waller', email: 'miawaller@geekol.com'},
      {id: 19, gender: 'm', firstname: 'Hewitt Guerrero', lastname: 'Alford', email: 'hewittalford@orbaxter.com'},
      {id: 20, gender: 'm', firstname: 'Savage Scott', lastname: 'Jarvis', email: 'savagejarvis@uni.com'}
    ];
  }
}

interface Person { id: number; gender: string; firstname: string; lastname: string; email: string};

const fs = require('fs');
const christmas = require('./christmas.json');
const { years } = christmas;
const adults = new Set<string>(christmas.adults);
const kids = new Set<string>(christmas.kids);
let { relations } = christmas; // instantiating like this for intellisense purposes
relations = {};

for (const relation of Object.keys(christmas.relations)) {
    let contents : { [key : string | number] : Set<string> };
    if (christmas.relations[relation] instanceof Array) {
        contents = [] as {[key: number]: Set<string>};
    }
    else {
        contents = {} as {[key: string]: Set<string>};
    }
    for (const key of Object.keys(christmas.relations[relation]))
        contents[key] = new Set(christmas.relations[relation][key]);
    relations[relation] = contents;
}

const current_year = 1 + Math.max(...Object.keys(years).map(x => Number(x)));
console.log(`Generating list for ${current_year}...`);

const people = kids.union(adults);

const ungiftable : { [name: string] : Set<string> } = {};

for (const person of people) {
    ungiftable[person] = new Set([person]);
}

for (const parent of Object.keys(relations.children)) {
    ungiftable[parent] = ungiftable[parent].union(relations.children[parent]);
    for (const child of relations.children[parent])
        ungiftable[child].add(parent);
}

for (const grandparent of Object.keys(relations.grandchildren)) {
    ungiftable[grandparent] = ungiftable[grandparent].union(relations.grandchildren[grandparent]);
    for (const grandchild of relations.grandchildren[grandparent])
        ungiftable[grandchild].add(grandparent);
}

for (const sibs of relations.siblings) {
    for (const person of sibs) {
        ungiftable[person] = ungiftable[person].union(sibs);
    }
}

for (const sps of relations.spouses) {
    for (const person of sps) {
        ungiftable[person] = ungiftable[person].union(sps);
    }
}

function find_giftable(group : Set<string>, backtrack_years : Array<string>) : null | { [name : string] : string } {
    const giftable = {} as { [name : string]: Set<string> };
    const targets = {} as { [name : string]: string };
    for (const person of group) {
        giftable[person] = group.difference(ungiftable[person]);
        targets[person] = null; // setting here rather than later forces ordering when iterated
    }
    for (const year of backtrack_years)
        for (const person of group) {
            // console.log(`${person} ${year}`);
            giftable[person].delete(years[year][person]);
        }

    const remaining = new Set(group);
    while(remaining.size > 0) {
        let min = Infinity;
        let smallest;
        for (const person of remaining) {
            if (giftable[person].size === 0)
                return null;
            if (min > giftable[person].size) {
                min = giftable[person].size;
                smallest = person;
            }
        }
        remaining.delete(smallest);
        // console.log(`${smallest}: ${Array.from(giftable[smallest].values())}`)
        const selection = Array.from(giftable[smallest].values())[Math.floor(giftable[smallest].size * Math.random())];
        // console.log(selection);
        targets[smallest] = selection;
        for (const person of remaining) {
            giftable[person].delete(selection);
        }
    }
    return targets;
}

function attempt_gifting(group : Set<string>, backtrack_years : Array<string>, label : string) {
    const y = backtrack_years.slice();
    let gifts;
    let attempts = 0;
    while(!(gifts = find_giftable(group, y)))
        if(attempts++ < 5)
            y.splice(0, 1), attempts = 0;
    console.log(attempts);
    console.log(`Earliest year for ${label}: ${y[0]}`);
    console.log();
    console.log(`${label}:`);
    for (const giver of Object.keys(gifts))
        console.log(`  ${giver}`.padEnd(16, '.') + ` gives to ${gifts[giver]}`);
    return gifts;
}

const adult_gifts = attempt_gifting(adults, Object.keys(years).slice(-10), "Adults");
const kid_gifts = attempt_gifting(kids, Object.keys(years).slice(-5), "Kids");

const all_gifts = {};
for (const adult of adults)
    all_gifts[adult] = adult_gifts[adult];
for (const kid of kids)
    all_gifts[kid] = kid_gifts[kid];

const sorted_gifts = {};
for(const giver of Object.keys(all_gifts).toSorted())
    sorted_gifts[giver] = all_gifts[giver];

years[current_year] = sorted_gifts;

const file_contents = {};

file_contents['adults'] = christmas.adults;
file_contents['kids'] = christmas.kids;
file_contents['relations'] = christmas.relations;
file_contents['years'] = years;

let filename = `./christmas_${current_year - 1}.json`;
let attempt = 0;
while (fs.existsSync(filename)) {
    filename = `./christmas_${current_year - 1}_${++attempt}.json`;
}
console.log(`Renaming christmas.json to ${filename}...`);
fs.renameSync('./christmas.json', filename);
console.log(`Renamed!`);

console.log('Writing file...');
fs.writeFileSync('./christmas.json', JSON.stringify(file_contents, null, 4));
console.log('Done!')
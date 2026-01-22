import csv
from pathlib import Path

# Path to the original CSV exported from Clay
INPUT_PATH = Path(
    "/Users/mikefishbein/Desktop/Vibe Coding/gtm/offer-testing/offers/ai-sales-roleplay-trainer/leads/roleplay_companies_clay_Find-jobs-Table-Default-view-export-1768922532821.csv"
)

# Path for the cleaned CSV we will generate
OUTPUT_PATH = INPUT_PATH.with_name(
    INPUT_PATH.stem + "_no-description-commas" + INPUT_PATH.suffix
)


def main() -> None:
    """
    Read the CSV, remove commas from the Description column only,
    and write a new cleaned CSV file.
    """
    with INPUT_PATH.open(mode="r", encoding="utf-8", newline="") as infile, OUTPUT_PATH.open(
        mode="w", encoding="utf-8", newline=""
    ) as outfile:
        reader = csv.reader(infile)
        writer = csv.writer(outfile)

        # Read header row so we can find the "Description" column index
        header = next(reader)

        try:
            description_idx = header.index("Description")
        except ValueError:
            raise SystemExit(
                "Could not find a 'Description' column in the CSV header. "
                f"Found columns: {header}"
            )

        # Write the header unchanged
        writer.writerow(header)

        # Process each remaining row
        for row in reader:
            # Some rows might be shorter; guard against index errors
            if len(row) > description_idx and row[description_idx]:
                # Remove all commas from the Description cell only
                row[description_idx] = row[description_idx].replace(",", "")

            writer.writerow(row)


if __name__ == "__main__":
    main()


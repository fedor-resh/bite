import { ActionIcon, Card, Center } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useDateRangeContext } from "@/hooks/useDateRangeContext";

dayjs.extend(isoWeek);
dayjs.locale("ru");

export default function CalendarForAverageDailyCalories() {
	const { setDatesFromTo, mondayOfWeek, sundayOfWeek, datesFromTo, goToNextWeek, goToPreWeek } =
		useDateRangeContext();

	const handleDateRangeChange = (value: [string | null, string | null] | null) => {
		if (!value) {
			setDatesFromTo([mondayOfWeek, sundayOfWeek]);
			return;
		}
		const [fromStr, toStr] = value;
		setDatesFromTo([fromStr ? new Date(fromStr) : null, toStr ? new Date(toStr) : null]);
	};

	return (
		<Card p="sm">
			<Center>
				<ActionIcon
					variant="subtle"
					c="dark.4"
					size="md"
					aria-label="Предыдущая неделя"
					onClick={goToPreWeek}
				>
					<IconChevronLeft size={18} />
				</ActionIcon>
				<DatePickerInput
					value={datesFromTo}
					onChange={handleDateRangeChange}
					type="range"
					leftSection={<IconCalendar size={18} stroke={1.5} />}
					placeholder="Выберите интервал"
					locale="ru"
					valueFormat="DD.MM.YYYY"
				/>
				<ActionIcon
					variant="subtle"
					c="dark.4"
					size="md"
					aria-label="Следующая неделя"
					onClick={goToNextWeek}
				>
					<IconChevronRight size={18} />
				</ActionIcon>
			</Center>
		</Card>
	);
}
